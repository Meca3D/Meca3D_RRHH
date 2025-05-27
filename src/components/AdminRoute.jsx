// En components/AdminRoute.jsx
import { Navigate } from 'react-router-dom';
import { useRol } from '../hooks/useRol';
import { CircularProgress, Box } from '@mui/material';

const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useRol();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/orders" replace />;
  }

  return children;
};

export default AdminRoute;
