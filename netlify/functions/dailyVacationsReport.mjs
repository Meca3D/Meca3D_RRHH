import admin from 'firebase-admin';
import { schedule } from '@netlify/functions';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  });
}

const handler = async () => {
  console.log('=== Iniciando reporte diario de ausencias ===');
  try {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    console.log('Fecha:', fechaHoy);

    // Mapa para almacenar ausentes: email -> { tipo: 'vacaciones'|'baja'|'permiso' }
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
      
      if (Array.isArray(solicitud.fechasActuales)) {
        if (solicitud.fechasActuales.includes(fechaHoy)) {
          ausentesMap.set(solicitud.solicitante, { tipo: 'vacaciones' });
        }
      }
    }

    // ---------------------------------------------------------
    // 2. PROCESAR OTRAS AUSENCIAS (Bajas y Permisos)
    // ---------------------------------------------------------
    const ausenciasSnapshot = await admin.firestore()
      .collection('AUSENCIAS')
      .where('estado', '==', 'aprobada')
      .get();

    console.log(`Solicitudes de ausencias analizadas: ${ausenciasSnapshot.size}`);

    for (const doc of ausenciasSnapshot.docs) {
      const solicitud = doc.data();
      
      // Las ausencias siempre deberían tener fechasActuales
      if (Array.isArray(solicitud.fechasActuales) && solicitud.fechasActuales.includes(fechaHoy)) {
        // Sobrescribe vacaciones si coinciden (la baja tiene prioridad visual)
        ausentesMap.set(solicitud.solicitante, { 
          tipo: solicitud.tipo || 'ausencia' // 'baja' o 'permiso'
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
    
    // Batch o promesas paralelas para optimizar
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

    const titulo = `📋 Reporte: ${emailsAusentes.length} ausencias hoy`;
    const mensajeCuerpo = lineasMensaje.join('\n');

    console.log('Titulo:', titulo);
    console.log('Cuerpo:', mensajeCuerpo);

    // ---------------------------------------------------------
    // 5. NOTIFICAR A OWNERS
    // ---------------------------------------------------------
    const ownersSnapshot = await admin.firestore()
      .collection('USUARIOS')
      //.where('rol', '==', 'owner')
      .where('rol', '==', 'admin')
      .get();

    if (ownersSnapshot.size === 0) {
      console.log('No hay owners para notificar');
      return new Response(JSON.stringify({ success: true, notificados: 0 }));
    }

    const notificaciones = [];
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

    for (const ownerDoc of ownersSnapshot.docs) {
      const ownerEmail = ownerDoc.id;
      const fcmTokens = ownerDoc.data()?.fcmTokens || [];

      if (fcmTokens.length === 0) continue;

      const validTokens = fcmTokens.filter(t => {
        const tokenTimestamp = t.timestamp?.toMillis ? t.timestamp.toMillis() : t.timestamp;
        return (Date.now() - tokenTimestamp) < SIXTY_DAYS_MS;
      }).map(t => t.token);

      if (validTokens.length === 0) continue;

      const message = {
        data: {
          title: titulo,
          body: mensajeCuerpo.replace(/<b>|<\/b>/g, ''), // Quitar HTML para notificación push simple
          url: '/admin', // O '/admin/ausencias/calendario' si prefieres
          type: 'reporte_ausencias',
          timestamp: new Date().toISOString()
        },
        tokens: validTokens
      };

      notificaciones.push(
        admin.messaging().sendEachForMulticast(message)
          .then(res => ({ email: ownerEmail, success: res.successCount }))
          .catch(err => ({ email: ownerEmail, error: err.message }))
      );
    }

    const resultados = await Promise.all(notificaciones);
    const exitosos = resultados.filter(r => r.success > 0).length;

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

export default schedule("0 5 * * 1-5", handler);
