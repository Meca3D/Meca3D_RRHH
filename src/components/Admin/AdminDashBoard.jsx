// components/Admin/AdminDashboard.jsx
import { useState } from 'react';
import { 
  Grid, Card, CardContent, Typography, Box, Container, AppBar,Toolbar,
  Avatar, Paper, IconButton, Chip, CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useGlobalData } from '../../hooks/useGlobalData';
import OwnerProfile from '../UI/OwnerProfile';

// Iconos
import MenuIcon from '@mui/icons-material/Menu';
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
import { useAdminStats } from '../../hooks/useAdminStats';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userProfile, isAuthenticated, isOwner, loading} = useAuthStore();
    const {
    empleadosCount,
    nominasTotalMes,
    solicitudesPendientes,
    loading: adminLoading
  } = useAdminStats();
  const [profileOpen,setProfileOpen]=useState(false)

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
  // Estadísticas del panel de administración
  const adminStats = [
    {
      title: 'Empleados',
      value: '3',
      subtitle: 'Ausentes',
      icon: PeopleIcon,
      color: 'rojo.main',
      bgColor: 'rojo.fondo',
      action: () => navigate('/admin/empleados')
    },
    {
      title: '€ Horas Extras',
      value: '34,800€',
      subtitle: 'Este mes',
      icon: PaymentIcon,
      color: 'verde.main',
      bgColor: 'verde.fondo',
      action: () => navigate('/admin/nominas')
    },
    {
      title: 'Solicitudes',
      value: '7',
      subtitle: 'Pendientes',
      icon: BeachAccessIcon,
      color: 'purpura.main',
      bgColor: 'purpura.fondo',
      action: () => navigate('/admin/vacaciones/pendientes')
    },
    {
      title: 'Productos',
      value: '25',
      subtitle: 'Desayunos',
      icon: RestaurantIcon,
      color: 'dorado.main',
      bgColor: 'dorado.fondo',
      action: () => navigate('/admin/desayunos')
    }
  ];
 const quickActions = [

    {
        id: 'calendario',
        title: 'Calendario Vacaciones',
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
      label: 'Gestión Desayunos',
      icon: RestaurantIcon,
      color: 'dorado.main',
      bgColor: 'dorado.fondo',
      onClick: () => navigate('/admin/desayunos')
    },
    {
      label: 'Reportes Analytics',
      icon: BarChartIcon,
      color: 'naranja.main',
      bgColor: 'naranja.fondo',
      onClick: () => navigate('/admin/reportes')
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
      onClick: () => navigate('/admin/configuracion')
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
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box 
            sx={{ 
              p: 1,
              m: -2, 
              borderRadius: 2, 
              bgcolor: bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon sx={{ color: color, fontSize: 30 }} />
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
          <Typography textAlign="center" variant="body2" fontWeight="600" color="text.primary" gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography textAlign="center" variant="caption" color="text.secondary">
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
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {adminStats.map((stat, index) => (
          <Grid size={{ xs: 6, md: 4 }} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

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
    </Container>
  );
};

export default AdminDashboard;
