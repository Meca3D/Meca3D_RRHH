// components/OwnerRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LoadingScreen from './Layout/LoadingScreen';

const NoOwnerRoute = ({ children }) => {
  const { isOwner, loading, isAuthenticated } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // El owner no puede acceder

  if (isOwner()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default NoOwnerRoute;
