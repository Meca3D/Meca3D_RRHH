// routes.jsx - Agregar las nuevas rutas de empleados
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Login from './components/Auth/Login';

// Componentes principales
import Dashboard from './components/Dashboard/Dashboard';
import OrderList from './components/Orders/OrderList';
import CreateOrder from './components/Orders/CreateOrder';
import OrderDetail from './components/Orders/OrderDetail';


// Componentes de administración
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './components/Admin/AdminDashBoard';

// Componentes de Desayunos Admin
import GestionDesayunos from './components/Admin/Desayunos/GestionDesayunos';
import CrearProducto from './components/Admin/Desayunos/CrearProducto';
import ModificarProducto from './components/Admin/Desayunos/ModificarProducto';
import EliminarProducto from './components/Admin/Desayunos/EliminarProducto';

// Componentes de Empleados Admin
import GestionEmpleados from './components/Admin/Empleados/GestionEmpleados';
import CrearEmpleado from './components/Admin/Empleados/CrearEmpleados';
import ListaEmpleados from './components/Admin/Empleados/ListaEmpleados';
import EditarEmpleados from './components/Admin/Empleados/EditarEmpleados';
import EliminarEmpleados from './components/Admin/Empleados/EliminarEmpleados';


// Componentes futuros
import Nominas from './components/Nominas/Nominas';
import MisVacaciones from './components/Vacaciones/MisVacaciones';
import MisHorasExtra from './components/HorasExtra/MisHorasExtra';

import LoadingScreen from './components/Layout/LoadingScreen';
import { useAuthStore } from './stores/authStore';

// Componente de protección de rutas
const ProtectedRoute = ({ children }) => {

  const { isAuthenticated, loading } = useAuthStore();;

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Ruta de login SIN layout */}
      <Route path="/login" element={<Login />} />

      {/* TODAS las rutas protegidas CON MainLayout */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        {/* Rutas anidadas - se renderizan dentro de MainLayout */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Rutas de Desayunos */}
        <Route path="desayunos/orders" element={<OrderList />} />
        <Route path="desayunos/orders/create" element={<CreateOrder />} />
        <Route path="desayunos/orders/:orderId" element={<OrderDetail />} />

        {/* Rutas de RRHH */}
        <Route path="nominas" element={<Nominas />} />
        <Route path="vacaciones" element={<MisVacaciones />} />
        <Route path="horas-extra" element={<MisHorasExtra />} />

        {/* Rutas de Administración */}
        <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        
        {/* Rutas de Gestión de Desayunos */}
        <Route path="admin/desayunos" element={<AdminRoute><GestionDesayunos /></AdminRoute>} />
        <Route path="admin/desayunos/productos/crear" element={<AdminRoute><CrearProducto /></AdminRoute>} />
        <Route path="admin/desayunos/productos/modificar" element={<AdminRoute><ModificarProducto /></AdminRoute>} />
        <Route path="admin/desayunos/productos/eliminar" element={<AdminRoute><EliminarProducto /></AdminRoute>} />
        
        {/* Rutas de Gestión de Empleados */}
        <Route path="admin/empleados" element={<AdminRoute><GestionEmpleados /></AdminRoute>} />
        <Route path="admin/empleados/lista" element={<AdminRoute><ListaEmpleados /></AdminRoute>} />
        <Route path="admin/empleados/crear" element={<AdminRoute><CrearEmpleado /></AdminRoute>} />
        <Route path="admin/empleados/editar" element={<AdminRoute><EditarEmpleados /></AdminRoute>} />
        <Route path="admin/empleados/eliminar" element={<AdminRoute><EliminarEmpleados /></AdminRoute>} />

         <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;