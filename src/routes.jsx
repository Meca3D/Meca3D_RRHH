import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Login from './components/Auth/Login';
import OrderList from './components/Orders/OrderList';
import CreateOrder from './components/Orders/CreateOrder';
import OrderDetail from './components/Orders/OrderDetail';
import Loading from './components/Layout/Loading';
import AdminRoute from './components/AdminRoute' ;
import AdminDashboard from './components/Admin/AdminDashBoard';
import CrearProducto from './components/Admin/CrearProducto';
import ModificarProducto from './components/Admin/ModificarProducto';
import EliminarProducto from './components/Admin/EliminarProducto';
import GestionUsuarios from './components/Admin/GestionUsuarios';
import { useAuth } from './hooks/useAuth';

// Componente de protección de rutas
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <Loading />;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <MainLayout>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rutas protegidas */}
        <Route path="/orders" element={
          <ProtectedRoute>
            <OrderList />
          </ProtectedRoute>
        } />
        <Route path="/orders/create" element={
          <ProtectedRoute>
            <CreateOrder />
          </ProtectedRoute>
        } />
        <Route path="/orders/:orderId" element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        } />
        
        {/* Rutas de administración */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
        <Route path="/admin/productos/crear" element={
          <AdminRoute>
            <CrearProducto />
          </AdminRoute>
        } />
        <Route path="/admin/productos/modificar" element={
          <AdminRoute>
            <ModificarProducto />
          </AdminRoute>
        } />
        <Route path="/admin/productos/eliminar" element={
          <AdminRoute>
            <EliminarProducto />
          </AdminRoute>
        } />
        <Route path="/admin/usuarios" element={
          <AdminRoute>
            <GestionUsuarios />
          </AdminRoute>
        } />
        
        {/* Redirecciones */}
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </MainLayout>
  );
};


export default AppRoutes;