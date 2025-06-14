// components/AdminRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LoadingScreen from './Layout/LoadingScreen';

const AdminRoute = ({ children }) => {
  const { userRole, loading, isAuthenticated } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Solo admin y owner pueden acceder a rutas de administración
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

  if (!isAdminOrOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
