import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuthStore } from '../stores/authStore';

export const useFirebaseAuth = () => {
  const { setUser, setUserRole, setUserProfile, logout } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'USUARIOS', user.email));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(user);
            setUserRole(userData.rol);
            setUserProfile({
              email: user.email,
              nombre: userData.nombre,
              rol: userData.rol,
              photoURL: userData.photoURL || null,
              favoritos: userData.favoritos || [],
              puesto: userData.puesto,
              nivel: userData.nivel,
              vacaDias: userData.vacaDias,
              vacaHoras: userData.vacaHoras
            });
          } else {
            console.error(`No se encontró el usuario ${user.email} en la colección USUARIOS`);
            logout();
          }
        } catch (error) {
          console.error('Error al obtener datos del usuario:', error);
          logout();
        }
      } else {
        logout();
      }
    });

    return () => unsubscribe();
  }, [setUser, setUserRole, setUserProfile, logout]);
};
