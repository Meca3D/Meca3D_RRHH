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
  console.log('=== INICIO sendNotification ===');
  console.log('Método:', event.httpMethod);
  
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
    const body = JSON.parse(event.body);
    console.log('Body recibido:', JSON.stringify(body, null, 2));
    
    const { empleadoEmail, title, body: messageBody, data } = body;

    if (!empleadoEmail || !title || !messageBody) {
      console.error('Parámetros faltantes');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan parámetros: empleadoEmail, title, body' })
      };
    }

    console.log(`Buscando usuario: ${empleadoEmail}`);

    // Obtener tokens del empleado
    const userDoc = await admin.firestore()
      .collection('USUARIOS')
      .doc(empleadoEmail)
      .get();
    
    if (!userDoc.exists) {
      console.error('Usuario no encontrado');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Usuario no encontrado' })
      };
    }

    const userData = userDoc.data();
    console.log('Usuario encontrado:', empleadoEmail);
    
    const fcmTokens = userData?.fcmTokens || [];
    console.log(`Tokens encontrados: ${fcmTokens.length}`);
    fcmTokens.forEach((t, i) => {
      console.log(`  Token ${i}: ${t.browser}/${t.device} - ${t.token.substring(0, 20)}...`);
    });
    
    if (fcmTokens.length === 0) {
      console.warn('Usuario sin tokens');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'Usuario sin dispositivos registrados',
          successCount: 0 
        })
      };
    }

    // Filtrar tokens válidos (< 60 días)
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const validTokens = fcmTokens.filter(t => {
      const tokenTimestamp = t.timestamp?.toMillis ? t.timestamp.toMillis() : t.timestamp;
      const tokenAge = now - tokenTimestamp;
      const isValid = tokenAge < SIXTY_DAYS_MS;
      console.log(`  Token ${t.device}/${t.browser}: ${isValid ? 'VÁLIDO' : 'EXPIRADO'} (${Math.floor(tokenAge / (24 * 60 * 60 * 1000))} días)`);
      return isValid;
    });

    console.log(`Tokens válidos: ${validTokens.length} de ${fcmTokens.length}`);

    if (validTokens.length === 0) {
      console.warn('Todos los tokens expirados');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'Todos los tokens han expirado',
          successCount: 0 
        })
      };
    }

    // Preparar mensaje
    const tokens = validTokens.map(t => t.token);

    const message = {

      data: {
        ...data,
        title: title,      
        body: messageBody,   
        url: data?.url || '/',
        timestamp: new Date().toISOString()
      },
      tokens
    };


    console.log('Mensaje preparado:');
    console.log('  Título:', title);
    console.log('  Cuerpo:', messageBody);
    console.log('  Destinos:', tokens.length);

    // Enviar a múltiples dispositivos
    console.log('Enviando notificación...');
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`✅ Éxitos: ${response.successCount}`);
    console.log(`❌ Fallos: ${response.failureCount}`);

    // Analizar respuestas individuales
    response.responses.forEach((resp, idx) => {
      const tokenInfo = validTokens[idx];
      if (resp.success) {
        console.log(`  ✅ ${tokenInfo.device}/${tokenInfo.browser}: Enviado`);
      } else {
        console.error(`  ❌ ${tokenInfo.device}/${tokenInfo.browser}: ${resp.error?.code} - ${resp.error?.message}`);
      }
    });

    // Limpiar tokens inválidos si hay fallos
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      
      console.log(`Eliminando ${failedTokens.length} token(s) inválido(s)`);
      
      const updatedTokens = fcmTokens.filter(t => !failedTokens.includes(t.token));
      await admin.firestore()
        .collection('USUARIOS')
        .doc(empleadoEmail)
        .update({ fcmTokens: updatedTokens });
    }
    
    console.log('=== FIN sendNotification ===');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        message: `Notificación enviada a ${response.successCount} de ${tokens.length} dispositivo(s)`,
        details: response.responses.map((resp, idx) => ({
          device: `${validTokens[idx].device}/${validTokens[idx].browser}`,
          success: resp.success,
          error: resp.error?.message
        }))
      })
    };

  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      })
    };
  }
};