// netlify/functions/change-password.js
const admin = require('firebase-admin');

// Inicializar Firebase Admin (similar a delete-employee)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

exports.handler = async (event, context) => {
  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: 'Método no permitido' })
    };
  }

  try {
    const { email, newPassword } = JSON.parse(event.body);

    // Validaciones
    if (!email || !newPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          message: 'Email y nueva contraseña son requeridos' 
        })
      };
    }

    if (newPassword.length < 6) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          message: 'La contraseña debe tener al menos 6 caracteres' 
        })
      };
    }

    // Obtener el usuario por email para conseguir su UID
    const userRecord = await admin.auth().getUserByEmail(email);

    // Cambiar la contraseña usando el UID
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });

    console.log(`Contraseña actualizada para usuario: ${email}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Contraseña actualizada correctamente para ${email}`
      })
    };

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);

    let errorMessage = 'Error interno del servidor';
    let statusCode = 500;

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Usuario no encontrado';
      statusCode = 404;
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'Contraseña inválida';
      statusCode = 400;
    }

    return {
      statusCode,
      body: JSON.stringify({
        success: false,
        message: errorMessage,
        error: error.message
      })
    };
  }
};
