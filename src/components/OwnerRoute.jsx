// components/OwnerRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LoadingScreen from './Layout/LoadingScreen';

const OwnerRoute = ({ children }) => {
  const { userRole, loading, isAuthenticated } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Solo el owner puede acceder
  const isOwner = userRole === 'owner';

  if (!isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default OwnerRoute;
