// hooks/useAuth.js
import { useContext } from 'react';
import { AuthContext } from '../components/Auth/AuthContext';
import { loginWithEmail, signOut } from '../firebase/auth';

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  const auth = useContext(AuthContext);
  
  // Iniciar sesión con email y contraseña
  const login = async (email, password) => {
    try {
      auth.clearError();
      const user = await loginWithEmail(email, password);
      return user;
    } catch (err) {
      auth.handleError(err);
      throw err;
    }
  };

  // Cerrar sesión
  const logout = async () => {
    try {
      auth.clearError();
      await signOut();
    } catch (err) {
      auth.handleError(err);
      throw err;
    }
  };

  // Devolver todas las propiedades del contexto junto con las funciones adicionales
  return {
    ...auth,
    login,
    logout
  };
};

export default useAuth;