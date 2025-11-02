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
// Definir título según acción
const titles = {
  'cancelacion': '🔴 Cancelación de vacaciones',
  'cancelacion_parcial': '🟡 Cancelación parcial de vacaciones',
  'solicitud': '📬 Nueva solicitud de vacaciones',
  'nueva_ausencia': '📋 Nueva solicitud de permiso',
  'baja_registrada': '🏥 Baja médica registrada',
  'permiso_auto_aprobado': '✅ Permiso auto-aprobado',
  'ausencia_auto_aprobada': '✅ Ausencia auto-aprobada',
  'cancelacion_ausencia': '⚠️ Cancelación de ausencia'
};


    const notificationTitle = titles[accion] || titles.solicitud;
    // Enviar notificación a cada admin
    const notificaciones = [];
    
    for (const doc of usuariosSnapshot.docs) {
      const adminEmail = doc.id;
      const fcmTokens = doc.data()?.fcmTokens || [];
      
      if (fcmTokens.length === 0) {
        console.log(`Admin ${adminEmail} sin tokens`);
        continue;
      }

      // Filtrar tokens válidos
      const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
      const validTokens = fcmTokens.filter(t => {
        const tokenTimestamp = t.timestamp?.toMillis ? t.timestamp.toMillis() : t.timestamp;
        const tokenAge = Date.now() - tokenTimestamp;
        return tokenAge < SIXTY_DAYS_MS;
      });

      if (validTokens.length === 0) {
        console.log(`Admin ${adminEmail} con tokens expirados`);
        continue;
      }

      const tokens = validTokens.map(t => t.token);
      
      const message = {
        data: {
          title: notificationTitle,
          body: body,
          url: '/gestion-vacaciones',
          type: accion || 'vacaciones_pendiente',
          timestamp: new Date().toISOString()
        },
        tokens
      };

      notificaciones.push(
        admin.messaging().sendEachForMulticast(message)
          .then(response => {
            console.log(`✅ ${adminEmail}: ${response.successCount}/${tokens.length} enviados`);
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
