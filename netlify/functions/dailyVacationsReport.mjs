import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  });
}

// ✅ Handler principal (sin import de schedule)
export default async (req, context) => {
  console.log('=== Iniciando reporte diario de ausencias ===');
  try {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    console.log('Fecha:', fechaHoy);

    // ---------------------------------------------------------
    // ✅ VERIFICAR SI HOY ES FESTIVO
    // ---------------------------------------------------------
    const añoActual = hoy.getFullYear();
    const festivosDoc = await admin.firestore()
      .collection('DIAS_FESTIVOS')
      .doc(añoActual.toString())
      .get();

    if (festivosDoc.exists) {
      const festivos = festivosDoc.data()?.festivos || [];
      const esFestivo = festivos.some(festivo => festivo.fecha === fechaHoy);
      
      if (esFestivo) {
        const nombreFestivo = festivos.find(f => f.fecha === fechaHoy)?.nombre || 'Festivo';
        console.log(`🎉 Hoy es festivo (${nombreFestivo}). No se enviarán notificaciones.`);
        return new Response(
          JSON.stringify({ 
            message: 'Hoy es festivo, no se envían notificaciones', 
            festivo: nombreFestivo,
            fecha: fechaHoy 
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('✅ Hoy es día laborable. Procesando ausencias...');

    // Mapa para almacenar ausentes
    const ausentesMap = new Map();

    // ---------------------------------------------------------
    // 1. PROCESAR VACACIONES
    // ---------------------------------------------------------
    const vacacionesSnapshot = await admin.firestore()
      .collection('VACACIONES')
      .where('estado', '==', 'aprobada')
      .get();

    console.log(`Solicitudes de vacaciones analizadas: ${vacacionesSnapshot.size}`);

    for (const doc of vacacionesSnapshot.docs) {
      const solicitud = doc.data();
      if (Array.isArray(solicitud.fechasActuales) && solicitud.fechasActuales.includes(fechaHoy)) {
        ausentesMap.set(solicitud.solicitante, { tipo: 'vacaciones' });
      }
    }

    // ---------------------------------------------------------
    // 2. PROCESAR OTRAS AUSENCIAS (Bajas y Permisos)
    // ---------------------------------------------------------
    const ausenciasSnapshot = await admin.firestore()
      .collection('AUSENCIAS')
      .where('estado', '==', 'aprobado')
      .get();

    console.log(`Solicitudes de ausencias analizadas: ${ausenciasSnapshot.size}`);

    for (const doc of ausenciasSnapshot.docs) {
      const solicitud = doc.data();
      if (Array.isArray(solicitud.fechasActuales) && solicitud.fechasActuales.includes(fechaHoy)) {
        ausentesMap.set(solicitud.solicitante, { 
          tipo: solicitud.tipo || 'ausencia'
        });
      }
    }

    const emailsAusentes = Array.from(ausentesMap.keys());
    console.log(`Total empleados ausentes hoy: ${emailsAusentes.length}`);

    // Si no hay nadie ausente, terminar
    if (emailsAusentes.length === 0) {
      console.log('No hay empleados ausentes hoy');
      return new Response(
        JSON.stringify({ message: 'No hay empleados ausentes hoy', empleados: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ---------------------------------------------------------
    // 3. OBTENER NOMBRES DE USUARIOS
    // ---------------------------------------------------------
    const datosUsuarios = {};
    
    await Promise.all(emailsAusentes.map(async (email) => {
      const userDoc = await admin.firestore().collection('USUARIOS').doc(email).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const nombreCompleto = userData.nombre || email;
        const nombreFormateado = nombreCompleto
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        datosUsuarios[email] = { nombre: nombreFormateado };
      } else {
        datosUsuarios[email] = { nombre: email };
      }
    }));

    // ---------------------------------------------------------
    // 4. CONSTRUIR MENSAJE AGRUPADO
    // ---------------------------------------------------------
    const grupos = {
      vacaciones: [],
      baja: [],
      permiso: []
    };

    emailsAusentes.forEach(email => {
      const info = ausentesMap.get(email);
      const nombre = datosUsuarios[email].nombre;
      grupos[info.tipo].push(nombre);
    });

    // Ordenar alfabéticamente cada grupo
    Object.keys(grupos).forEach(key => grupos[key] = grupos[key].sort());

    // Generar líneas del mensaje
    let lineasMensaje = [];

    if (grupos.vacaciones.length > 0) {
      lineasMensaje.push(`🏖️ Vacaciones: ${grupos.vacaciones.join(', ')}`);
    }
    if (grupos.baja.length > 0) {
      lineasMensaje.push(`🏥 Bajas: ${grupos.baja.join(', ')}`);
    }
    if (grupos.permiso.length > 0) {
      lineasMensaje.push(`📝 Permisos: ${grupos.permiso.join(', ')}`);
    }

    const titulo = `📋 Ausencias hoy: ${emailsAusentes.length}`;
    const mensajeCuerpo = lineasMensaje.join('\n');
    
    console.log('Titulo:', titulo);
    console.log('Cuerpo:', mensajeCuerpo);

    // ---------------------------------------------------------
    // 5. NOTIFICAR A OWNERS
    // ---------------------------------------------------------
    const ownersSnapshot = await admin.firestore()
      .collection('USUARIOS')
      .where('rol', '==', 'owner')
      .get();

    if (ownersSnapshot.size === 0) {
      console.log('No hay owners para notificar');
      return new Response(
        JSON.stringify({ success: true, notificados: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const notificaciones = [];

    for (const ownerDoc of ownersSnapshot.docs) {
      const ownerEmail = ownerDoc.id;
      const ownerData = ownerDoc.data();
      const fcmTokens = ownerData?.fcmTokens || [];

      // Verificar preferencia de notificaciones
      if (ownerData?.notificacionesAusencias === false) {
        console.log(`Owner ${ownerEmail} tiene deshabilitadas las notificaciones`);
        continue;
      }

      if (fcmTokens.length === 0) continue;

      const tokens = fcmTokens.map(t => t.token).filter(Boolean);

      if (tokens.length === 0) continue;

      const message = {
        data: {
          title: titulo,
          body: mensajeCuerpo,
          url: '/admin',
          type: 'reporte_ausencias',
          timestamp: new Date().toISOString()
        },
        tokens: tokens
      };

      notificaciones.push(
        admin.messaging().sendEachForMulticast(message)
          .then(async res => {
        console.log(`✅ Notificado a ${ownerEmail}: ${res.successCount}/${tokens.length} tokens exitosos`);       
        // Limpiar tokens que fallaron
        if (res.failureCount > 0) {
          console.log(`⚠️ ${res.failureCount} tokens fallidos para ${ownerEmail}`);
          // implementar limpieza de tokens inválidos si quieres
            const invalidTokens = [];
            res.responses.forEach((r, idx) => {
              if (!r.success) {
                console.log(`❌ ${ownerEmail} token[${idx}]`, r.error?.code, r.error?.message);
              }
              if (!r.success && ['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(r.error?.code)) {
                invalidTokens.push(tokens[idx]);
              }
            });

            // 🔥 LIMPIEZA AQUÍ
            if (invalidTokens.length > 0) {
              const cleaned = fcmTokens.filter(t => !invalidTokens.includes(t.token));
              await admin.firestore()
                .collection('USUARIOS')
                .doc(ownerEmail)
                .update({ fcmTokens: cleaned });

              console.log(`🧹 ${ownerEmail}: ${invalidTokens.length} token(s) eliminados`);
            }


        }
        return { email: ownerEmail, success: res.successCount, failed: res.failureCount };
      })
          .catch(err => ({ email: ownerEmail, error: err.message }))
      );
    }

    const resultados = await Promise.all(notificaciones);
    const exitosos = resultados.filter(r => r.success > 0).length;

    console.log('=== Reporte completado ===');
    return new Response(
      JSON.stringify({
        success: true,
        fecha: fechaHoy,
        totalAusentes: emailsAusentes.length,
        detalle: grupos,
        ownersNotificados: exitosos
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generando reporte:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const config = {
  schedule: "30 6 * * 1-5" // Lunes a viernes a las 5:00 AM UTC (7:00 AM Madrid en invierno)
};
