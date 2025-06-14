// components/Dashboard/Dashboard.jsx
import {
  Grid, Card, CardContent, Typography, Box, Container, 
  Avatar, CircularProgress, Paper, IconButton, Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useOrdersStore } from '../../stores/ordersStore';
import { useProductsStore } from '../../stores/productsStore';
import { useGlobalData } from '../../hooks/useGlobalData';

// Iconos
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import EuroIcon from '@mui/icons-material/Euro';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { formatearNombre } from '../Helpers';

const Dashboard = () => {
  const navigate = useNavigate();
  const { dataLoaded, loading, ordersCount } = useGlobalData();
  const { orders } = useOrdersStore();
  const { products } = useProductsStore();
  const { user, userProfile } = useAuthStore();

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

  // Estadísticas principales con colores MD3
  const stats = [
    {
      title: 'Este Mes',
      value: '150€',
      subtitle: 'Extras',
      icon: EuroIcon,
      color: 'verde.main',
      bgColor: 'verde.fondo',
      action: true
    },
    {
      title: 'Solicitudes',
      value: `${2}`,
      subtitle: 'Pendientes',
      icon: NotificationsOutlinedIcon,
      color: 'azul.main', 
      bgColor: 'azul.fondo',
      action: true
    },
    {
      title: 'Vacaciones',
      value: `${userProfile?.vacaDias || 20}d ${userProfile?.vacaHoras || 3}h`,
      subtitle: 'Días disponibles',
      icon: BeachAccessOutlinedIcon,
      color: 'purpura.main', 
      bgColor: 'purpura.fondo',
      action: true
    },
    {
      title: 'Horas Extras',
      value: `10h`,
      subtitle: 'Este mes',
      icon: AccessTimeIcon,
      color: 'naranja.main', 
      bgColor: 'naranja.fondo',
      action: true
    }
  ];

  // Acciones rápidas con colores MD3
  const quickActions = [
    {
      label: 'Registrar Horas Extra',
      icon: AddIcon,
      color: 'naranja.main',
      bgColor: 'naranja.fondo',
      onClick: () => navigate('/horas-extra')
    },
    {
      label: 'Solicitar Vacaciones',
      icon: BeachAccessOutlinedIcon,
      color: 'purpura.main',
      bgColor: 'purpura.fondo',
      onClick: () => navigate('/vacaciones')
    },
    {
      label: 'Registrar Permiso',
      icon: AssignmentOutlinedIcon,
      color: 'rojo.main',
      bgColor: 'rojo.fondo',
      onClick: () => navigate('/permisos')
    },
    {
      label: 'Pedido Desayuno',
      icon: LocalCafeOutlinedIcon,
      color: 'dorado.main',
      bgColor: 'dorado.fondo',
      onClick: () => navigate('/desayunos/orders')
    }
  ];

  // Componente StatCard con estilo MD3
  const StatCard = ({ title, value, subtitle, icon: Icon, color, bgColor, action }) => (
    <Card 
      elevation={0}
      onClick={action}
      sx={{ 
        height: '100%',
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.08)',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)'
        }
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
        <Box sx={{display:'flex', flexDirection:'column', justifyItems:'center', justifyContent:'center', alignItems:'center', alignContent:'center'}}>
        <Typography  textAlign="center" variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          {value}
        </Typography>
        <Typography  textAlign="center" variant="body2" fontWeight="600" color="text.primary" gutterBottom>
          {title}
        </Typography >
        {subtitle && (
          <Typography  textAlign="center" variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        </Box>
      </CardContent>
    </Card>
  );

  // Componente QuickAction con estilo MD3
  const QuickAction = ({ label, icon: Icon, color, bgColor, onClick }) => (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{ 
        cursor: 'pointer',
        bgcolor:bgColor,
        border: '1px solid',
        borderRadius: 3,
        minHeight: 100,
        borderColor: 'rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)',
          borderColor: color
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
          p: 2,
          textAlign: 'center'
        }}
      >

          <Icon sx={{ mb:1, color: color, fontSize: 28 }} />
        
        <Typography 
          variant="body2" 
          fontWeight="600" 
          sx={{ color:color, lineHeight: 1.2 }}
        >
          {label}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header con gradiente MD3 */}
      <Paper 
        elevation={0} 
        sx={{  
          mb: 4, 
          background: 'linear-gradient(135deg,   #3b82f6 0%, #1e40af 100%)',
          color: 'white',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.08)',
          transition: 'all 0.3s ease',
            '&:hover': {
            boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
            transform: 'translateY(-2px)'
        }}}
      >
        {/* Decoración de fondo */}
        <Box 
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.15)',
            zIndex: 0
          }}
        />
        <Box 
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
            zIndex: 0
          }}
        />
        
        <Box display="flex" alignItems="center" gap={3} position="relative" zIndex={1}>
          <Avatar 
            src={userProfile?.photoURL} 
            sx={{ 
              ml:1,
              width: 80, 
              height: 80, 
              border: '4px solid rgba(255,255,255,0.2)',
              fontSize: '2rem'
            }}
          >
            {(!userProfile?.photoURL && userProfile?.nombre) ? 
              userProfile.nombre.charAt(0).toUpperCase() : 
              (user?.email?.[0] || 'U').toUpperCase()
            }
          </Avatar>
          <Box flex={1}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {formatearNombre(userProfile?.nombre)}
            </Typography>
            <Typography fontSize="1rem" sx={{ opacity: 0.9, mb: 1 }}>
              {userProfile?.puesto||'Operario'} • Nv {userProfile?.nivel||'7'} 
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Grid de estadísticas MD3 */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid size={{ xs:6, md:3 }} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      {/* Acciones rápidas */}
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
          Acciones Rápidas
        </Typography>
        <Grid container spacing={2}>
          {quickActions.map((action, index) => (
            <Grid  size={{ xs:6, md:3 }} key={index}>
              <QuickAction {...action} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
};

export default Dashboard;
