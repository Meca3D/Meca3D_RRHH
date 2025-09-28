// components/AdminRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LoadingScreen from './Layout/LoadingScreen';

const AusenciasRoute = ({ children }) => {
  const { userRole, loading, isAuthenticated } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Solo cocinero, admin y owner pueden acceder a rutas de administración desayunos
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner' || userRole === 'leaveAdmin';

  if (!isAdminOrOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AusenciasRoute;