// firebase/auth.js
import { 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    onAuthStateChanged
  } from 'firebase/auth';
  import { doc, getDoc, setDoc } from 'firebase/firestore';
  import { auth, db } from './config';
  
  // Iniciar sesión con email y contraseña
  export const loginWithEmail = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Verificar si el usuario existe en la colección de usuarios
      await checkUserInDatabase(userCredential.user);
      return userCredential.user;
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      throw error;
    }
  };
  
  // Verificar si el usuario existe en Firestore, si no, crearlo
  const checkUserInDatabase = async (user) => {
    const userRef = doc(db, 'USUARIOS', user.email);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Si el usuario no existe en la base de datos, lo creamos
      await setDoc(userRef, {
        nombre: user.displayName || user.email.split('@')[0], // Usa el nombre de usuario del email si no hay displayName
        email: user.email,
        favoritos: []
      });
    }
  };
  
  // Cerrar sesión
  export const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      return true;
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  };
  
  // Observador del estado de autenticación
  export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
  };