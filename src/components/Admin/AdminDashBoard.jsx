// components/Admin/AdminDashboard.jsx
import { 
  Grid, Card, CardContent, Typography, Box, Container, AppBar,Toolbar,
  Avatar, Paper, IconButton, Chip, CircularProgress,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStats } from '../../hooks/useAdminStats';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import { useAusenciasStore } from '../../stores/ausenciasStore';

// Iconos
import MenuIcon from '@mui/icons-material/Menu';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import PeopleIcon from '@mui/icons-material/People';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PaymentIcon from '@mui/icons-material/Payment';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import FastFoodOutlinedIcon from '@mui/icons-material/FastfoodOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { useEffect } from 'react';


const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isOwner, loading, user} = useAuthStore();
  const { configVacaciones, loadConfigVacaciones, procesarSolicitudesCaducadas } = useVacacionesStore();
  const { configAusencias, loadConfigAusencias } = useAusenciasStore();
  const {
    trabajadoresVacacionesHoy,
    trabajadoresVacacionesMañana,
    solicitudesPendientes,
    permisosPendientes,
    autoAprobacionActiva,
    loadingStats,
  } = useAdminStats();

  useEffect(() => {
    const unsubVac = loadConfigVacaciones();
    const unsubAus = loadConfigAusencias(); 
    return () => { 
      if (typeof unsubVac === 'function') unsubVac();
      if (typeof unsubAus === 'function') unsubAus(); 
    };
  }, [loadConfigVacaciones, loadConfigAusencias]); 

  useEffect(() => {
    const procesarCaducadas = async () => {
      try {
        const resultado = await procesarSolicitudesCaducadas();
        
        if (resultado.procesadas > 0) {
          console.log(`🔄 Dashboard: ${resultado.procesadas} solicitudes caducadas procesadas automáticamente`);
          
        }
      } catch (error) {
        console.error('❌ Error procesando solicitudes caducadas en Dashboard:', error);
      }
    };

    if (user?.email && !loading) {
      const timeoutId = setTimeout(procesarCaducadas, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user?.email, loading, procesarSolicitudesCaducadas]);

    if (loading) {
      return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Box textAlign="center" p={4}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Cargando datos de la aplicación...
            </Typography>
          </Box>
        </Container>
      );
    }

  const getVacacionesColor = (cantidad) => {
    if (cantidad <= 3) return { color: 'verde.main', bgColor: 'verde.fondo' };
    if (cantidad <= 6) return { color: 'naranja.main', bgColor: 'naranja.fondo' };
    return { color: 'rojo.main', bgColor: 'rojo.fondo' };
  };
  // Estadísticas del panel de administración
  const adminStats = [
    {
      title: trabajadoresVacacionesHoy===1 ? 'Trabajador' : 'Trabajadores',
      value: loadingStats ? '...' : trabajadoresVacacionesHoy.toString(),
      subtitle: trabajadoresVacacionesHoy===1? 'Ausente Hoy':'Ausentes Hoy',
      icon: TodayOutlinedIcon,
      ...getVacacionesColor(trabajadoresVacacionesHoy),
      action: () => navigate('/admin/vacaciones/calendario')
    },
    {
      title: trabajadoresVacacionesMañana===1 ? 'Trabajador' : 'Trabajadores',
      value: loadingStats ? '...' : trabajadoresVacacionesMañana.toString(),
      subtitle: trabajadoresVacacionesMañana===1? 'Ausente Mañana':'Ausentes Mañana',
      icon: EventOutlinedIcon,
      ...getVacacionesColor(trabajadoresVacacionesMañana),
      action: () => navigate('/admin/vacaciones/calendario')
    },
/*     {
      title: '€ Horas Extras',
      value: '34,800€',
      subtitle: 'Este mes',
      icon: PaymentIcon,
      color: 'verde.main',
      bgColor: 'verde.fondo',
      action: () => navigate('/admin/nominas')
    }, */
  {
    title: 'Vacaciones',
    value: loadingStats ? '...' : solicitudesPendientes.toString(),
    subtitle: 'Pendientes',
    icon: ListAltOutlinedIcon,
    color: 'naranja.main',
    bgColor: 'naranja.fondo',
    action: () => navigate('/admin/vacaciones/pendientes')
  },
    {
    title: permisosPendientes===1? 'Permiso':'Permisos',
    value: loadingStats ? '...' : permisosPendientes.toString(),
    subtitle: permisosPendientes===1? 'Pendiente':'Pendientes',
    icon: ListAltOutlinedIcon,
    color: 'purpura.main',
    bgColor: 'purpura.fondo',
    action: () => navigate('/admin/ausencias/pendientes')
  },
  
  ];
 const quickActions = [

    {
        id: 'calendario',
        title: 'Calendario Ausencias',
        description: 'Calendario visual de vacaciones del personal',
        icon: CalendarMonthOutlinedIcon,
        route: '/admin/vacaciones/calendario',
        color: 'verde.main',
        bgColor: 'verde.fondo',
    },
      {
        id: 'pedirDesayuno',
        title: 'Pedir Desayuno',
        description: 'Pedir Desayuno de los Sabados',
        icon: FastFoodOutlinedIcon,
        route: '/desayunos/orders',
        color: 'dorado.main',
        bgColor: 'dorado.fondo',
    },
  ]
  // Módulos de administración
  const adminModules = [
    {
      label: 'Gestión Empleados',
      icon: PeopleIcon,
      color: 'azul.main',
      bgColor: 'azul.fondo',
      onClick: () => navigate('/admin/empleados')
    },
    {
      label: 'Gestión Vacaciones',
      icon: BeachAccessIcon,
      color: 'purpura.main',
      bgColor: 'purpura.fondo',
      onClick: () => navigate('/admin/vacaciones')
    },
    {
     label: 'Permisos y Bajas',
     icon: AssignmentOutlinedIcon,
     color: 'naranja.main',
     bgColor: 'naranja.fondo',
     onClick: () => navigate('/admin/ausencias')
   }, 
    {
      label: 'Gestión Desayunos',
      icon: RestaurantIcon,
      color: 'dorado.main',
      bgColor: 'dorado.fondo',
      onClick: () => navigate('/admin/desayunos')
    },
        {
      label: 'Utilidades',
      icon: ConstructionOutlinedIcon,
      color: 'verde.main',
      bgColor: 'verde.fondo',
      onClick: () => navigate('/admin/utilidades')
    },
    {
      label: 'Configuración',
      icon: SettingsIcon,
      color: 'rojo.main',
      bgColor: 'rojo.fondo',
      onClick: () => navigate('/admin/configuracion/configuracionVacas')
    //  onClick: () => navigate('/admin/configuracion')
    }
  ];

  // Componente StatCard igual que en Dashboard
  const StatCard = ({ title, value, subtitle, icon: Icon, color, bgColor, action }) => (
    <Card 
      elevation={0}
      onClick={action}
      sx={{ 
        height: '100%',
        cursor: action ? 'pointer' : 'default',
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.08)',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': action ? {
          boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)'
        } : {}
      }}
    >
      <CardContent sx={{ p: 1 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="center" mb={2}>
          <Box 
            sx={{ 
              p: 1,
              m: -1,
              mt:0, 
              borderRadius: 2, 
              bgcolor: bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon sx={{ color: color, fontSize: 40 }} />
          </Box>
        </Box>
        <Box sx={{
          display: 'flex', 
          flexDirection: 'column', 
          justifyItems: 'center', 
          justifyContent: 'center', 
          alignItems: 'center', 
          alignContent: 'center'
        }}>
          <Typography textAlign="center" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
            {value}
          </Typography>
          <Typography textAlign="center" variant="body1" fontWeight="600" color="text.primary" >
            {title}
          </Typography>
          {subtitle && (
            <Typography textAlign="center" fontSize={'0.95rem'}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  
  // Componente AdminModule igual que QuickAction
  const AdminModule = ({ label, icon: Icon, color, bgColor, onClick }) => (
    <Card
      onClick={onClick}
      elevation={0}
      sx={{ 
        bgcolor: bgColor,
        border: '1px solid',
        borderRadius: 3,
        minHeight: 120,
        borderColor: 'rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)',
          borderColor: color,
          '& .admin-icon': {
            transform: 'scale(1.1)'
          }
        }
      }}
    >
      <CardContent 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 3,
          textAlign: 'center'
        }}
      >
        <Icon 
          sx={{ 
            mb: 1,
            color: color, 
            fontSize: 28,
          }} 
        />
        <Typography 
          variant="body1" 
          fontWeight="600" 
          sx={{ color: color, lineHeight: 1.3 }}
        >
          {label}
        </Typography>
      </CardContent>
    </Card>
  );


  return (
    <Container maxWidth="lg" sx={{mb: 4,mt:2 }}>
      
      {/* Grid de estadísticas administrativas */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {adminStats.map((stat, index) => (
          <Grid size={{ xs: 6, md: 4 }} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>
      <Card onClick={ () => navigate('/admin/configuracion/configuracionVacas')}  
       display='flex' elevation={0}
        sx={{mb:2, p:2, color:autoAprobacionActiva ? 'verde.main' : 'default', flexDirection:'column', alignItems:'center', justifyContent:'center'}} >
      <Typography fontSize='1.1rem' textAlign="center" alignItems='center' color={'rojo.main'} fontWeight="bold">
        CONFIGURACION DE AUSENCIAS
      </Typography>
      <Divider sx={{bgcolor:'black', mb:1}} />
      <Box sx={{display:'flex', justifyContent:'space-between'}}>
      <Typography fontSize='1.1rem'  alignItems='center' color={configVacaciones?.ventaVacaciones?.habilitado ?"azul.main": 'grey'} fontWeight="bold">
        Venta de Vacaciones:
      </Typography>
      <Typography fontSize='1.1rem'  alignItems='center' color={configVacaciones?.ventaVacaciones?.habilitado ?"azul.main": 'grey'} fontWeight="bold">
        <strong>{configVacaciones?.ventaVacaciones?.habilitado ? 'ON' : 'OFF'}</strong>
      </Typography>
      </Box>
      <Box sx={{display:'flex', justifyContent:'space-between'}}>
       <Typography fontSize='1.1rem'  alignItems='center' color={autoAprobacionActiva ?"azul.main": 'grey'} fontWeight="bold">
        Auto-Aprobación Vacaciones: 
      </Typography>
      <Typography fontSize='1.1rem'  alignItems='center' color={autoAprobacionActiva ?"azul.main": 'grey'} fontWeight="bold">
        <strong>{autoAprobacionActiva ? 'ON' : 'OFF'}</strong>
      </Typography>
      </Box>
      {configVacaciones?.autoAprobar?.habilitado && (
        <Box display="flex" justifyContent='space-between' alignItems="center" sx={{}}>
        <Typography fontSize='1.1rem'  color={autoAprobacionActiva ?"azul.main": 'grey'} fontWeight="600" fontStyle='italic'>
        Modo:
        </Typography>
        <Typography fontSize='1.1rem' color={autoAprobacionActiva ?"azul.main": 'grey'} fontWeight="600" fontStyle='italic'>
          {configVacaciones.autoAprobar.modo === 'todas' ? 'Todas las solicitudes' :
          configVacaciones.autoAprobar.modo === 'noVentas' ? 'Todas menos las ventas' :
          configVacaciones.autoAprobar.modo === 'porHoras' ? `Solicitudes ≤ ${configVacaciones.autoAprobar.maxHoras} horas` :
          configVacaciones.autoAprobar.modo === 'sinConflictos' ? 'Solo si no hay conflictos de cobertura' :
          configVacaciones.autoAprobar.modo === 'porHorasYsinConflictos' ? `≤ ${configVacaciones.autoAprobar.maxHoras} horas y sin conflictos` :
          ''}
          </Typography>
        </Box>
      )}
      <Box sx={{display:'flex', justifyContent:'space-between'}}>
       <Typography fontSize='1.1rem'  alignItems='center' color={configAusencias?.autoAprobar?.habilitado  ?"azul.main": 'grey'} fontWeight="bold">
        Auto-Aprobación Permisos: 
      </Typography>
      <Typography fontSize='1.1rem'  alignItems='center' color={configAusencias?.autoAprobar?.habilitado  ?"azul.main": 'grey'} fontWeight="bold">
        <strong>{configAusencias?.autoAprobar?.habilitado  ? 'ON' : 'OFF'}</strong>
      </Typography>
      </Box>
      </Card>

      {/* Grid de acciones rapidas para owner*/}
      {isOwner()&&
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3,
          mb:3, 
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.08)'
        }}
      >
        <Typography textAlign="center" variant="h6" fontWeight="bold" color="text.primary" mb={3}>
          Acciones Rápidas
        </Typography>
      <Grid container spacing={3}>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Grid size={{xs:6 ,sm:3}}  key={action.id}>
                    <Card 
                      elevation={5}
                      onClick={() => navigate(action.route)}
                      sx={{ 
                        height: '100%',
                        border: '1px solid',
                        borderColor: 'rgba(0,0,0,0.08)',
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                          transform: 'translateY(-2px)'
                        },
                      }}
                         >
                                <CardContent sx={{ p: 3 }}>
                                  <Box display="flex" justifyContent="center" alignItems="flex-start"  mb={2}>
                                    <Box 
                                      sx={{ 
                                        p: 1,
                                        m: -2, 
                                        borderRadius: 2, 
                                        bgcolor: action.bgColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      <Icon sx={{ color: action.color, fontSize: 30 }} />
                                    </Box>
      
                                  </Box>
                                   <Box sx={{mt:3, display:'flex', flexDirection:'column', justifyItems:'center', justifyContent:'center', alignItems:'center', alignContent:'center'}}>
             
                                  <Typography textAlign="center" variant="body1" fontSize="1.1rem" fontWeight="600" sx={{ mb:-1, color:action.color, lineHeight: 1.2 }}>
                                    {action.title}
                                  </Typography>
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          );
                        })}
                        </Grid>
                        </Paper>
                        }
      {/* Módulos de administración */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.08)'
        }}
      >
        <Typography textAlign="center" variant="h6" fontWeight="bold" color="text.primary" mb={3}>
          Módulos de Administración
        </Typography>
        <Grid container spacing={3}>
          {adminModules.map((module, index) => (
            <Grid size={{ xs: 6, md: 4 }} key={index}>
              <AdminModule {...module} />
            </Grid>
          ))}
        </Grid>
      </Paper>
        <Box>
        </Box>
    </Container>
  );
};

export default AdminDashboard;
