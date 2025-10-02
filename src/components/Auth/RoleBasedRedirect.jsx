// src/components/Auth/RoleBasedRedirect.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import LoadingScreen from '../Layout/LoadingScreen';

const RoleBasedRedirect = () => {
  const { loading, isAuthenticated, isOwner } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return isOwner() ? (
    <Navigate to="/admin" replace />
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

export default RoleBasedRedirect;
