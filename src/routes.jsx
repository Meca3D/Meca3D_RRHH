// routes.jsx - Agregar las nuevas rutas de empleados
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Login from './components/Auth/Login';
import RoleBasedRedirect from './components/Auth/RoleBasedRedirect';


import Dashboard from './components/Dashboard/Dashboard';
import OrderList from './components/Orders/OrderList';
import CreateOrder from './components/Orders/CreateOrder';
import OrderDetail from './components/Orders/OrderDetail';

import AdminRoute from './components/AdminRoute';
import NoOwnerRoute from './components/NoOwnerRoute';
import CocineroRoute from './components/CocineroRoute';
import AusenciasRoute from './components/AusenciasRoute';
import AdminDashboard from './components/Admin/AdminDashBoard';

import GestionDesayunos from './components/Admin/Desayunos/GestionDesayunos';
import CrearProducto from './components/Admin/Desayunos/CrearProducto';
import ModificarProducto from './components/Admin/Desayunos/ModificarProducto';
import EliminarProducto from './components/Admin/Desayunos/EliminarProducto';

import GestionEmpleados from './components/Admin/Empleados/GestionEmpleados';
import CrearEmpleado from './components/Admin/Empleados/CrearEmpleados';
import ListaEmpleados from './components/Admin/Empleados/ListaEmpleados';
import EditarEmpleados from './components/Admin/Empleados/EditarEmpleados';
import EliminarEmpleados from './components/Admin/Empleados/EliminarEmpleados';

import GestionVacaciones from './components/Admin/Vacaciones/GestionVacaciones';
import GestionarSaldos from './components/Admin/Vacaciones/GestionarSaldos';
import GestionFestivos from './components/Admin/Utilidades/GestionFestivos';
import CalculadoraAjusteCalendario from './components/Admin/Utilidades/CalculadoraAjusteCalendario';
import GestionNivelesSalariales from './components/Admin/Utilidades/GestionNivelesSalariales';
import SolicitudesPendientes from './components/Admin/Vacaciones/SolicitudesPendientes';
import CalendarioVacacionesAdmin from './components/Admin/Vacaciones/CalendarioVacacionesAdmin';
import HistorialSolicitudes from './components/Admin/Vacaciones/HistorialSolicitudes';
import EstadisticasVacasAdmin from './components/Admin/Vacaciones/EstadisticasVacasAdmin';
import SaldosVacaciones from './components/Admin/Vacaciones/SaldosVacaciones';
import ConfiguracionVacacionesAdmin from './components/Admin/Configuracion/ConfiguracionVacacionesAdmin';
import GestionUtilidades from './components/Admin/Utilidades/GestionUtilidades';
import GestionConfiguracion from './components/Admin/Configuracion/GestionConfiguracion';
import GestionAusencias from './components/Admin/Ausencias/GestionAusencias';
import AusenciasPendientes from './components/Admin/Ausencias/AusenciasPendientes';
import HistorialAusencias from './components/Admin/Ausencias/HistorialAusencias';
import CrearAusenciaAdmin from './components/Admin/Ausencias/CrearAusenciaAdmin';
import PenalizacionBajas from './components/Admin/Ausencias/PenalizacionBajas';


import Nominas from './components/Nominas/Nominas';
import ConfigurarDatosSalariales from './components/Nominas/ConfigurarDatosSalariales';
import GenerarNomina from './components/Nominas/GenerarNomina';
import GestionarNominas from './components/Nominas/GestionarNominas';
import EstadisticasNominas from './components/Nominas/EstadisticasNominas';
import Vacaciones from './components/Vacaciones/Vacaciones';
import CrearSolicitudVacaciones from './components/Vacaciones/CrearSolicitudVacaciones';
import EditarSolicitudVacaciones from './components/Vacaciones/EditarSolicitudVacaciones';
import MisSolicitudesVacaciones from './components/Vacaciones/MisSolicitudesVacaciones';
import MiSaldoVacaciones from './components/Vacaciones/MiSaldoVacaciones';
import VentaVacaciones from './components/Vacaciones/VentaVacaciones';
import HorasExtras from './components/HorasExtras/HorasExtras';
import RegistrarHorasExtras from './components/HorasExtras/RegistrarHorasExtras';
import GestionarHorasExtras from './components/HorasExtras/GestionarHorasExtras';
import EstadisticasHorasExtras from './components/HorasExtras/EstadisticasHorasExtras';
import ConfiguracionHorasExtras from './components/HorasExtras/ConfiguracionHorasExtras';
import Ausencias from './components/Ausencias/Ausencias';
import CrearAusencia from './components/Ausencias/CrearAusencia';
import MisAusencias from './components/Ausencias/MisAusencias';
import AñadirAusencia from './components/Ausencias/AñadirDiasAusencia';

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
        <Route index element={<RoleBasedRedirect />} />

        {/* Rutas anidadas - se renderizan dentro de MainLayout */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Rutas de Desayunos */}
        <Route path="desayunos/orders" element={<OrderList />} />
        <Route path="desayunos/orders/create" element={<CreateOrder />} />
        <Route path="desayunos/orders/:orderId" element={<OrderDetail />} />

        {/* Rutas de RRHH */}
        <Route path="/nominas" element={<NoOwnerRoute><Nominas /></NoOwnerRoute>} />
        <Route path="/nominas/configurar" element={<NoOwnerRoute><ConfigurarDatosSalariales /></NoOwnerRoute>} />
        <Route path="/nominas/generar" element={<NoOwnerRoute><GenerarNomina /></NoOwnerRoute>} />
        <Route path="/nominas/generar/:id" element={<NoOwnerRoute><GenerarNomina /></NoOwnerRoute>} />
        <Route path="/nominas/gestionar" element={<NoOwnerRoute><GestionarNominas /></NoOwnerRoute>} />
        <Route path="/nominas/estadisticas" element={<NoOwnerRoute><EstadisticasNominas /></NoOwnerRoute>} />
        <Route path="/vacaciones" element={<NoOwnerRoute><Vacaciones /></NoOwnerRoute>} />
        <Route path="/vacaciones/crear" element={<NoOwnerRoute><CrearSolicitudVacaciones /></NoOwnerRoute>} />
        <Route path="/vacaciones/editar/:solicitudId" element={<NoOwnerRoute><EditarSolicitudVacaciones /></NoOwnerRoute>} />
        <Route path="/vacaciones/solicitudes" element={<NoOwnerRoute><MisSolicitudesVacaciones /></NoOwnerRoute>} />
        <Route path="/vacaciones/saldo" element={<NoOwnerRoute><MiSaldoVacaciones /></NoOwnerRoute>} />
        <Route path="/vacaciones/vender" element={<NoOwnerRoute><VentaVacaciones /></NoOwnerRoute>} />
        <Route path="/vacaciones/estadisticas" element={<NoOwnerRoute></NoOwnerRoute>} />
        <Route path="/horas-extras" element={<NoOwnerRoute><HorasExtras /></NoOwnerRoute>} />
        <Route path="/horas-extras/registrar" element={<NoOwnerRoute><RegistrarHorasExtras /></NoOwnerRoute>} />
        <Route path="/horas-extras/gestionar" element={<NoOwnerRoute><GestionarHorasExtras /></NoOwnerRoute>} />
        <Route path="/horas-extras/estadisticas" element={<NoOwnerRoute><EstadisticasHorasExtras /></NoOwnerRoute>} />
        <Route path="/horas-extras/configurar" element={<NoOwnerRoute><ConfiguracionHorasExtras /></NoOwnerRoute>} /> 
        <Route path="/ausencias" element={<NoOwnerRoute><Ausencias /></NoOwnerRoute>} /> 
        <Route path="/ausencias/crear" element={<NoOwnerRoute><CrearAusencia /></NoOwnerRoute>} /> 
        <Route path="/ausencias/solicitudes" element={<NoOwnerRoute><MisAusencias /></NoOwnerRoute>} /> 
        <Route path="/ausencias/agregarDias/:ausenciaId" element={<NoOwnerRoute><AñadirAusencia /></NoOwnerRoute>} /> 

        {/* Rutas de Administración */}
        <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        
        {/* Rutas de Gestión de Desayunos */}
        <Route path="admin/desayunos" element={<CocineroRoute><GestionDesayunos /></CocineroRoute>} />
        <Route path="admin/desayunos/productos/crear" element={<CocineroRoute><CrearProducto /></CocineroRoute>} />
        <Route path="admin/desayunos/productos/modificar" element={<CocineroRoute><ModificarProducto /></CocineroRoute>} />
        <Route path="admin/desayunos/productos/eliminar" element={<CocineroRoute><EliminarProducto /></CocineroRoute>} />
        
        {/* Rutas de Gestión de Empleados */}
        <Route path="admin/empleados" element={<AdminRoute><GestionEmpleados /></AdminRoute>} />
        <Route path="admin/empleados/lista" element={<AdminRoute><ListaEmpleados /></AdminRoute>} />
        <Route path="admin/empleados/crear" element={<AdminRoute><CrearEmpleado /></AdminRoute>} />
        <Route path="admin/empleados/editar" element={<AdminRoute><EditarEmpleados /></AdminRoute>} />
        <Route path="admin/empleados/eliminar" element={<AdminRoute><EliminarEmpleados /></AdminRoute>} />

        {/* Rutas de Gestión de Vacaciones */}
        <Route path="admin/vacaciones" element={<AusenciasRoute><GestionVacaciones /></AusenciasRoute>} />
        <Route path="admin/vacaciones/pendientes" element={<AusenciasRoute><SolicitudesPendientes /></AusenciasRoute>} />
        <Route path="admin/vacaciones/calendario" element={<AusenciasRoute><CalendarioVacacionesAdmin /></AusenciasRoute>} />
        <Route path="admin/vacaciones/historial" element={<AusenciasRoute><HistorialSolicitudes /></AusenciasRoute>} />
        <Route path="admin/vacaciones/saldos" element={<AusenciasRoute><GestionarSaldos /></AusenciasRoute>} />
        <Route path="admin/vacaciones/evolucionsaldos" element={<AusenciasRoute><SaldosVacaciones /></AusenciasRoute>} />
        <Route path="admin/vacaciones/estadisticas" element={<AusenciasRoute><EstadisticasVacasAdmin /></AusenciasRoute>} />

        {/* Rutas de Gestión de Ausencias */}
        <Route path="admin/ausencias" element={<AusenciasRoute><GestionAusencias /></AusenciasRoute>} />
        <Route path="admin/ausencias/pendientes" element={<AusenciasRoute><AusenciasPendientes /></AusenciasRoute>} />
        <Route path="admin/ausencias/historial" element={<AusenciasRoute><HistorialAusencias /></AusenciasRoute>} />
        <Route path="admin/ausencias/crear" element={<AusenciasRoute><CrearAusenciaAdmin /></AusenciasRoute>} />
        <Route path="admin/ausencias/penalizaciones" element={<AusenciasRoute><PenalizacionBajas /></AusenciasRoute>} />

        {/* Rutas de Utilidades */}
        <Route path="admin/utilidades" element={<AusenciasRoute><GestionUtilidades /></AusenciasRoute>} />
        <Route path="admin/utilidades/festivos" element={<AusenciasRoute><GestionFestivos /></AusenciasRoute>} />
        <Route path="admin/utilidades/niveles_salariales" element={<AdminRoute><GestionNivelesSalariales /></AdminRoute>} />
        <Route path="admin/utilidades/ajuste_calendario" element={<AdminRoute><CalculadoraAjusteCalendario /></AdminRoute>} />

        {/* Rutas de configuracion */}
        <Route path="admin/configuracion" element={<AusenciasRoute><GestionConfiguracion /></AusenciasRoute>} />
        <Route path="admin/configuracion/configuracionVacas" element={<AusenciasRoute><ConfiguracionVacacionesAdmin /></AusenciasRoute>} />

         <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;