import admin from 'firebase-admin';

// Inicializar Firebase Admin solo una vez
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Faltan variables de entorno de Firebase');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error.message);
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { empleadoEmail, title, body, data } = JSON.parse(event.body);

    // Obtener todos los tokens del usuario
    const userDoc = await admin.firestore()
      .collection('USUARIOS')
      .doc(empleadoEmail)
      .get();
    
    const fcmTokens = userDoc.data()?.fcmTokens || [];
    
    if (fcmTokens.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Usuario sin tokens FCM' })
      };
    }

    // Filtrar tokens válidos (menos de 60 días)
    const SIXTY_DAYS = 1000 * 60 * 60 * 24 * 60;
    const validTokens = fcmTokens.filter(t => {
      const tokenAge = Date.now() - t.timestamp.toMillis();
      return tokenAge < SIXTY_DAYS;
    });

    // Extraer solo los strings de tokens
    const tokens = validTokens.map(t => t.token);

    if (tokens.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Tokens expirados' })
      };
    }

    // Enviar a múltiples dispositivos
    const message = {
      notification: { title, body },
      data: data || {},
      tokens: tokens 
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Limpiar tokens inválidos si hay fallos
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      
      // Remover tokens fallidos
      const updatedTokens = fcmTokens.filter(t => !failedTokens.includes(t.token));
      await admin.firestore()
        .collection('USUARIOS')
        .doc(empleadoEmail)
        .update({ fcmTokens: updatedTokens });
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        successCount: response.successCount,
        failureCount: response.failureCount 
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};