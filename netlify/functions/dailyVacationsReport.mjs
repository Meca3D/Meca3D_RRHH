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
  console.log('=== Iniciando reporte diario de vacaciones ===');
  
  try {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    
    console.log('Fecha:', fechaHoy);
    
    // 1. Obtener solicitudes aprobadas que incluyan hoy
    const solicitudesSnapshot = await admin.firestore()
      .collection('VACACIONES')
      .where('estado', '==', 'aprobada')
      .get();
    
    console.log(`Solicitudes aprobadas: ${solicitudesSnapshot.size}`);
    
    // 2. Filtrar las que tienen la fecha de hoy y no está cancelada
    const empleadosVacacionesHoy = new Set();
    
    for (const doc of solicitudesSnapshot.docs) {
      const solicitud = doc.data();
      
      // Verificar que incluye hoy
      if (!Array.isArray(solicitud.fechas) || !solicitud.fechas.includes(fechaHoy)) {
        continue;
      }
      
      // Verificar que hoy no esté cancelado parcialmente
      const diasCancelados = [];
      if (Array.isArray(solicitud.cancelacionesParciales)) {
        solicitud.cancelacionesParciales.forEach(cancel => {
          if (Array.isArray(cancel.fechasCanceladas)) {
            diasCancelados.push(...cancel.fechasCanceladas);
          }
        });
      }
      
      if (!diasCancelados.includes(fechaHoy)) {
        empleadosVacacionesHoy.add(solicitud.solicitante);
      }
    }
    
    const emailsEmpleados = Array.from(empleadosVacacionesHoy);
    console.log(`Empleados de vacaciones: ${emailsEmpleados.length}`);

    // Si no hay nadie de vacaciones, terminar
    if (emailsEmpleados.length === 0) {
      console.log('No hay empleados de vacaciones hoy');
      return new Response(
        JSON.stringify({ message: 'No hay empleados de vacaciones hoy', empleados: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Obtener nombres usando los emails
    const datosUsuarios = {};
    for (const email of emailsEmpleados) {
      const userDoc = await admin.firestore()
        .collection('USUARIOS')
        .doc(email)
        .get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        // Formatear nombre (Primera letra mayúscula de cada palabra)
        const nombreCompleto = userData.nombre || email;
        const nombreFormateado = nombreCompleto
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        datosUsuarios[email] = {
          nombre: nombreFormateado,
          puesto: userData.puesto || 'Sin definir'
        };
      } else {
        datosUsuarios[email] = {
          nombre: email,
          puesto: 'Sin definir'
        };
      }
    }
    
    // 4. Construir mensaje
    let mensaje;
    let titulo;
    
    if (emailsEmpleados.length === 0) {
      titulo = '✅ Sin vacaciones hoy';
      mensaje = 'Hoy no hay trabajadores de vacaciones';
    } else if (emailsEmpleados.length === 1) {
      const empleado = datosUsuarios[emailsEmpleados[0]];
      titulo = '🏖️ 1 empleado de vacaciones';
      mensaje = `${empleado.nombre} está de vacaciones hoy`;
    } else {
      // Ordenar alfabéticamente
      const nombresOrdenados = emailsEmpleados
        .map(email => datosUsuarios[email].nombre)
        .sort();
      
      titulo = `🏖️ ${emailsEmpleados.length} empleados de vacaciones`;
      mensaje = `Hoy: ${nombresOrdenados.join(', ')}`;
    }
    
    console.log('Mensaje:', mensaje);
    
    // 5. Obtener owners
    const ownersSnapshot = await admin.firestore()
      .collection('USUARIOS')
      .where('rol', '==', 'owner')
      .get();
    
    console.log(`Owners encontrados: ${ownersSnapshot.size}`);
    
    if (ownersSnapshot.size === 0) {
      console.log('No hay owners para notificar');
      return new Response(
        JSON.stringify({
          success: true,
          mensaje,
          empleadosVacaciones: emailsEmpleados.length,
          ownersNotificados: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 6. Enviar notificación a cada owner
    const notificaciones = [];
    
    for (const ownerDoc of ownersSnapshot.docs) {
      const ownerEmail = ownerDoc.id;
      const fcmTokens = ownerDoc.data()?.fcmTokens || [];
      
      if (fcmTokens.length === 0) {
        console.log(`Owner ${ownerEmail} sin tokens`);
        continue;
      }
      
      // Filtrar tokens válidos (< 60 días)
      const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
      const validTokens = fcmTokens.filter(t => {
        const tokenTimestamp = t.timestamp?.toMillis ? t.timestamp.toMillis() : t.timestamp;
        const tokenAge = Date.now() - tokenTimestamp;
        return tokenAge < SIXTY_DAYS_MS;
      });
      
      if (validTokens.length === 0) {
        console.log(`Owner ${ownerEmail} con tokens expirados`);
        continue;
      }
      
      const tokens = validTokens.map(t => t.token);
      
      const message = {
        data: {
          title: titulo,
          body: mensaje,
          url: '/admin',
          type: 'reporte_vacaciones',
          timestamp: new Date().toISOString()
        },
        tokens
      };
      
      notificaciones.push(
        admin.messaging().sendEachForMulticast(message)
          .then(response => {
            console.log(`✅ ${ownerEmail}: ${response.successCount}/${tokens.length}`);
            return { email: ownerEmail, success: response.successCount };
          })
          .catch(error => {
            console.error(`❌ ${ownerEmail}:`, error.message);
            return { email: ownerEmail, error: error.message };
          })
      );
    }
    
    const resultados = await Promise.all(notificaciones);
    const exitosos = resultados.filter(r => r.success > 0).length;
    
    console.log('=== Reporte completado ===');
    
    return new Response(
      JSON.stringify({
        success: true,
        fecha: fechaHoy,
        empleadosVacaciones: emailsEmpleados.length,
        empleados: emailsEmpleados.map(email => datosUsuarios[email].nombre),
        ownersNotificados: exitosos,
        mensaje: mensaje
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error generando reporte:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// De lunes a viernes a las 7:00 AM (Madrid)
// 6:00 UTC en invierno, 5:00 UTC en verano
export default schedule("0 5 * * 1-5", handler);
