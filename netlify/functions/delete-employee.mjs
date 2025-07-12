// netlify/functions/delete-employee.mjs
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

export default async (request, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    if (request.method === 'OPTIONS') {
      return new Response(JSON.stringify({ message: 'OK' }), {
        status: 200,
        headers
      });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed'
        }),
        {
          status: 405,
          headers
        }
      );
    }

    if (!admin.apps.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Firebase no está configurado correctamente'
        }),
        {
          status: 500,
          headers
        }
      );
    }

    // ✅ Parsear datos de entrada
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Datos JSON inválidos'
        }),
        {
          status: 400,
          headers
        }
      );
    }

    const { email } = requestData;

    // ✅ Validar email requerido
    if (!email || typeof email !== 'string' || !email.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email es requerido y debe ser válido'
        }),
        {
          status: 400,
          headers
        }
      );
    }

    const emailTrimmed = email.trim();
    
    // ✅ Variables para tracking del proceso
    let authDeleted = false;
    let firestoreDeleted = false;
    let userRecord = null;
    let authError = null;
    let firestoreError = null;

    console.log(`🗑️ Iniciando eliminación de empleado: ${emailTrimmed}`);

    // ✅ PASO 1: Intentar obtener usuario de Auth y eliminarlo
    try {
      console.log(`🔍 Buscando usuario en Auth...`);
      userRecord = await admin.auth().getUserByEmail(emailTrimmed);
      
      if (userRecord) {
        console.log(`👤 Usuario encontrado en Auth: UID ${userRecord.uid}`);
        
        // Eliminar de Firebase Auth
        await admin.auth().deleteUser(userRecord.uid);
        authDeleted = true;
        console.log(`✅ Usuario eliminado de Auth exitosamente`);
      }
    } catch (error) {
      authError = error;
      console.error(`❌ Error en Auth:`, error.code, error.message);
      
      // Si el usuario no existe en Auth, no es error crítico
      if (error.code === 'auth/user-not-found') {
        console.log(`ℹ️ Usuario no existe en Auth, continuando...`);
      } else {
        console.error(`❌ Error crítico en Auth:`, error.message);
      }
    }

    // ✅ PASO 2: Intentar eliminar de Firestore (independiente del resultado de Auth)
    try {
      console.log(`🔍 Eliminando documento de Firestore...`);
      
      // Verificar si el documento existe
      const docRef = admin.firestore().collection('USUARIOS').doc(emailTrimmed);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        await docRef.delete();
        firestoreDeleted = true;
        console.log(`✅ Documento eliminado de Firestore exitosamente`);
      } else {
        console.log(`ℹ️ Documento no existe en Firestore`);
        // Marcamos como "eliminado" porque no había nada que eliminar
        firestoreDeleted = true;
      }
    } catch (error) {
      firestoreError = error;
      console.error(`❌ Error en Firestore:`, error.message);
    }

    // ✅ EVALUAR RESULTADO FINAL
    const totalSuccess = authDeleted && firestoreDeleted;
    const partialFailure = (authDeleted && !firestoreDeleted) || (!authDeleted && firestoreDeleted);
    const totalFailure = !authDeleted && !firestoreDeleted;

    // ✅ CONSTRUIR RESPUESTA DETALLADA
    let message = '';
    let statusCode = 200;

    if (totalSuccess) {
      message = `Usuario ${emailTrimmed} eliminado completamente del sistema`;
      statusCode = 200;
    } else if (partialFailure) {
      message = `Eliminación parcial de ${emailTrimmed}. `;
      if (authDeleted && !firestoreDeleted) {
        message += `Eliminado de Auth pero falló en Firestore: ${firestoreError?.message}`;
      } else if (!authDeleted && firestoreDeleted) {
        message += `Eliminado de Firestore pero falló en Auth: ${authError?.message}`;
      }
      statusCode = 207; // Multi-Status
    } else {
      message = `Error eliminando ${emailTrimmed} del sistema. Auth: ${authError?.message}, Firestore: ${firestoreError?.message}`;
      statusCode = 500;
    }

    // ✅ RESPUESTA COMPLETA
    const responseData = {
      success: totalSuccess,
      partialFailure: partialFailure,
      email: emailTrimmed,
      authDeleted: authDeleted,
      firestoreDeleted: firestoreDeleted,
      message: message,
      details: {
        userExistedInAuth: !!userRecord,
        userUID: userRecord?.uid || null,
        authError: authError ? {
          code: authError.code,
          message: authError.message
        } : null,
        firestoreError: firestoreError ? {
          message: firestoreError.message
        } : null
      }
    };

    console.log(`📊 Resultado final:`, responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        status: statusCode,
        headers
      }
    );

  } catch (error) {
    console.error('❌ Error crítico en delete-employee:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Error interno del servidor: ${error.message}`,
        authDeleted: false,
        firestoreDeleted: false
      }),
      {
        status: 500,
        headers
      }
    );
  }
};

export const config = {
  path: "/api/delete-employee",
  method: ["POST", "OPTIONS"]
};
