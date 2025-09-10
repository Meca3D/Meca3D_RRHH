// netlify/functions/create-employee.mjs
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
    
    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error.message);
    // NO hacer throw aquí - manejar en el handler
  }
}

export default async (request, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json' // ✅ IMPORTANTE: Siempre JSON
  };

  try {
    // Manejar preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(JSON.stringify({ message: 'OK' }), {
        status: 200,
        headers
      });
    }

    // Solo permitir POST
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

    // ✅ VERIFICAR que Firebase esté inicializado
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

    // Leer y validar datos del request
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

const { 
      email, 
      password, 
      nombre, 
      rol = 'user', 
      vacaDisponibles,
      fechaIngreso,
      nivel,
    } = requestData;

    // Validar datos requeridos
    if (!email || !password || !nombre) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email, password y nombre son requeridos' 
        }),
        {
          status: 400,
          headers
        }
      );
    }

    console.log(`📝 Creando usuario: ${email}`);

    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nombre,
      emailVerified: false
    });

    console.log(`✅ Usuario creado en Auth: ${userRecord.uid}`);

    // Crear documento en Firestore
    await admin.firestore().collection('USUARIOS').doc(email).set({
      nombre: nombre,
      rol: rol,
      vacaciones:{
        disponibles: Number(vacaDisponibles) || 0,
        pendientes: 0
      },
      fechaIngreso: fechaIngreso || '', // String en formato YYYY-MM-DD
      nivel: Number(nivel) || null, // Número 1-21
      favoritos: [],
    });

    console.log(`✅ Documento creado en Firestore para: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: userRecord.uid,
        message: `Usuario ${nombre} creado exitosamente`
      }),
      {
        status: 200,
        headers
      }
    );

  } catch (error) {
    console.error('❌ Error en create-employee:', error);
    
    // ✅ SIEMPRE retornar JSON válido, incluso en errores
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Error interno: ${error.message}` 
      }),
      {
        status: 500,
        headers
      }
    );
  }
};

export const config = {
  path: "/api/create-employee",
  method: ["POST", "OPTIONS"]
};
