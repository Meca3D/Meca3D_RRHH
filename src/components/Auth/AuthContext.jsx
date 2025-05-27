// components/Auth/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { onAuthChange } from '../../firebase/auth';
import { getUsuario } from '../../firebase/firestore';

// Crear el contexto de autenticación
const AuthContext = createContext();

// Proveedor del contexto de autenticación
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Efecto para observar cambios en el estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Obtener datos adicionales del usuario
          const userData = await getUsuario(user.email);
          setUserData(userData);
        } catch (err) {
          console.error("Error al obtener datos del usuario:", err);
        }
      } else {
        // Si no hay usuario, limpiamos userData
        setUserData(null);
      }
      
      setLoading(false);
    });

    // Limpiar el observador cuando el componente se desmonte
    return () => unsubscribe();
  }, []);

  // Actualizar datos del usuario cuando cambia
  const refreshUserData = async () => {
    if (currentUser) {
      try {
        const userData = await getUsuario(currentUser.email);
        setUserData(userData);
      } catch (err) {
        console.error("Error al actualizar datos del usuario:", err);
      }
    }
  };

  // Gestión de errores
  const handleError = (error) => {
    setError(error.message);
    console.error("Error en autenticación:", error);
  };

  // Limpiar errores
  const clearError = () => {
    setError(null);
  };

  // Valor que se proporcionará al contexto
  const value = {
    currentUser,
    userData,
    loading,
    error,
    handleError,
    clearError,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <div>Cargando...</div>}
    </AuthContext.Provider>
  );
};

// Exportamos el contexto por separado para que pueda ser utilizado por useAuth.js
export { AuthContext };