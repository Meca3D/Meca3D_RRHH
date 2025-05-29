

// netlify/functions/create-employee.mjs
import admin from 'firebase-admin';

// Inicializar Firebase Admin solo una vez
if (!admin.apps.length) {
    try {
    // ✅ Verificar que las variables existen
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
        privateKey: privateKey.replace(/\\n/g, '\n'), // ✅ Convertir \n a saltos de línea reales
      }),
    });
    
    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
    throw error;
  }
}

export default async (request, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Manejar preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers
    });
  }

  // Solo permitir POST
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Leer datos del request
    const { email, password, nombre, rol = 'user' } = await request.json();

    // Validar datos requeridos
    if (!email || !password || !nombre) {
      return new Response(
        JSON.stringify({ error: 'Email, password y nombre son requeridos' }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nombre,
      emailVerified: false
    });

    // Crear documento en Firestore
    await admin.firestore().collection('USUARIOS').doc(email).set({
      id: email,
      nombre: nombre,
      favoritos:[],
      rol: rol
    });

    return new Response(
      JSON.stringify({
        success: true,
        userId: userRecord.uid,
        message: `Usuario ${nombre} creado exitosamente`
      }),
      {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error creando usuario:', error);
    return new Response(
      JSON.stringify({ 
        error: `Error interno: ${error.message}` 
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }
};

// Configuración de la función
export const config = {
  path: "/api/create-employee",
  method: ["POST", "OPTIONS"]
};
