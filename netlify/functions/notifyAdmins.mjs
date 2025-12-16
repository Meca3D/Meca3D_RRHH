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

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { solicitante, nombreSolicitante, diasSolicitados, esVenta, horasSolicitadas, accion, mensaje } = JSON.parse(event.body);

    console.log(`Notificando admins sobre ${accion || 'solicitud'} de ${nombreSolicitante} (${solicitante})`);


    // Obtener todos los usuarios con roles admin, owner o leaveAdmin
    const usuariosSnapshot = await admin.firestore()
      .collection('USUARIOS')
      .where('rol', 'in', ['admin', 'owner', 'leaveAdmin'])
      .get();

    console.log(`${usuariosSnapshot.size} administrador(es) encontrado(s)`);

    // Construir mensaje según la acción
    let body;
    if (mensaje) {
      // Si viene un mensaje personalizado, usarlo
      body = mensaje;
    } else {
      // Mensaje por defecto para solicitudes nuevas
      body = esVenta
        ? `${nombreSolicitante} solicita vender ${horasSolicitadas}h`
        : `${nombreSolicitante} solicita ${diasSolicitados} de vacaciones`;
    }

    
// Definir título según acción
const titles = {
  // Vacaciones
      'solicitud': esVenta ? '💰 Nueva venta de vacaciones' : '🏖️ Nueva solicitud de vacaciones',
      'cancelacion': '🔴 Cancelación de vacaciones',
      'ampliacion_vacaciones': '🔵 Ampliación de vacaciones',
      'cancelacion_parcial': '🟡 Cancelación parcial de vacaciones',
      'vacaciones_eliminada': '🗑️ Solicitud de vacaciones eliminada',
      
      // Ausencias (Bajas/Permisos)
      'nueva_ausencia': '📋 Nueva solicitud de ausencia',
      'baja_registrada': '🏥 Baja registrada',
      'ausencia_aprobada_auto': '✅ Ausencia auto-aprobada',
      'edicion_ausencia': '📝 Modificación de ausencia',
      'cancelacion_parcial_ausencia': '✂️ Días de ausencia cancelados',
      'cancelacion_total_ausencia': '🚫 Ausencia cancelada',
      'eliminacion_ausencia': '🗑️ Ausencia eliminada',
      
      // Default
      'default': '🔔 Nueva notificación de RRHH'
};

    const notificationTitle = titles[accion] || titles.solicitud;
    const notificationBody = mensaje || body;
    let targetUrl = null;
    const a = accion || '';
    if (!targetUrl) {
      if (a.includes('ausencia') || a.includes('baja')) {
        targetUrl = '/admin/ausencias'; 
      } else {
        targetUrl = '/admin/vacaciones';
      }
    }
    // Enviar notificación a cada admin
    const notificaciones = [];
    
    for (const doc of usuariosSnapshot.docs) {
      const adminEmail = doc.id;
      const fcmTokens = doc.data()?.fcmTokens || [];
      const tokens = fcmTokens.map(t => t.token);
      
      if (tokens.length === 0) {
        console.log(`Admin ${adminEmail} sin tokens`);
        continue;
      }
      
      const message = {
        data: {
          title: notificationTitle,
          body: notificationBody,
          url: targetUrl, 
          type: accion || 'general',
          timestamp: new Date().toISOString()
        },
        tokens
      };

     notificaciones.push(
        admin.messaging().sendEachForMulticast(message)
          .then(async response => {
            console.log(`✅ ${adminEmail}: ${response.successCount}/${tokens.length} enviados`);

            const invalidTokens = [];

            response.responses.forEach((r, idx) => {
              if (!r.success) {
                console.log(`❌ ${adminEmail} token[${idx}]`, r.error?.code, r.error?.message);
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
                .doc(adminEmail)
                .update({ fcmTokens: cleaned });

              console.log(`🧹 ${adminEmail}: ${invalidTokens.length} token(s) eliminados`);
            }

            return { email: adminEmail, success: response.successCount };
          })
          .catch(error => {
            console.error(`❌ ${adminEmail}:`, error.message);
            return { email: adminEmail, error: error.message };
          })
      );
    }

    const resultados = await Promise.all(notificaciones);

    const exitosos = resultados.filter(r => r.success > 0).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        adminsNotificados: exitosos,
        totalAdmins: usuariosSnapshot.size,
        detalles: resultados
      })
    };

  } catch (error) {
    console.error('Error notificando admins:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
