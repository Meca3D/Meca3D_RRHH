// En hooks/useRoles.js
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getUsuario } from '../firebase/firestore';

export const useRol = () => {
  const { currentUser } = useAuth();
  const [userRol, setUserRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRol = async () => {
      if (!currentUser) {
        setUserRol(null);
        setLoading(false);
        return;
      }

      try {
        const userData = await getUsuario(currentUser.email);
        setUserRol(userData?.rol || 'user');
      } catch (error) {
        console.error("Error al obtener rol:", error);
        setUserRol('user'); // Rol por defecto
      } finally {
        setLoading(false);
      }
    };

    fetchUserRol();
  }, [currentUser]);

  const isAdmin = userRol === 'admin';
  
  return { userRol, isAdmin, loading };
};
