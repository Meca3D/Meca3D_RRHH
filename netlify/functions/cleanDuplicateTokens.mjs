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
    const { token, currentUserEmail } = JSON.parse(event.body);

    if (!token || !currentUserEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan parámetros: token, currentUserEmail' })
      };
    }

    console.log(`Limpiando token duplicado para ${currentUserEmail}`);

    // Obtener todos los usuarios
    const usersSnapshot = await admin.firestore().collection('USUARIOS').get();
    let removedFrom = [];

    // Buscar y remover el token de otros usuarios
    for (const userDoc of usersSnapshot.docs) {
      if (userDoc.id !== currentUserEmail) {
        const userData = userDoc.data();
        const fcmTokens = userData?.fcmTokens || [];
        
        const hasToken = fcmTokens.some(t => t.token === token);
        
        if (hasToken) {
          const updatedTokens = fcmTokens.filter(t => t.token !== token);
          await userDoc.ref.update({ fcmTokens: updatedTokens });
          removedFrom.push(userDoc.id);
          console.log(`Token removido de ${userDoc.id}`);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        removedFrom,
        message: removedFrom.length > 0 
          ? `Token removido de ${removedFrom.length} usuario(s)` 
          : 'Token no encontrado en otros usuarios'
      })
    };

  } catch (error) {
    console.error('Error limpiando tokens:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
