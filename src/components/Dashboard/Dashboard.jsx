// components/Dashboard/Dashboard.jsx
import React from 'react';
import { 
  Grid, Card, CardContent, Typography, Box, 
  CardActionArea, Container, Chip, Avatar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Iconos
import RestaurantIcon from '@mui/icons-material/Restaurant';
import PaymentIcon from '@mui/icons-material/Payment';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NotificationsIcon from '@mui/icons-material/Notifications';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const quickActions = [
    {
      title: 'Desayunos del Sábado',
      description: 'Ver y crear pedidos de desayuno',
      icon: <RestaurantIcon sx={{ fontSize: 40 }} />,
      path: '/desayunos/orders',
      color: 'secondary',
      stats: '3 pedidos activos'
    },
    {
      title: 'Mi Última Nómina',
      description: 'Consultar nómina del mes actual',
      icon: <PaymentIcon sx={{ fontSize: 40 }} />,
      path: '/nominas',
      color: 'success',
      stats: 'Enero 2025'
    },
    {
      title: 'Solicitar Vacaciones',
      description: 'Gestionar mis días de vacaciones',
      icon: <BeachAccessIcon sx={{ fontSize: 40 }} />,
      path: '/vacaciones',
      color: 'info',
      stats: '15 días disponibles'
    },
    {
      title: 'Registrar Horas Extra',
      description: 'Anotar horas extras trabajadas',
      icon: <AccessTimeIcon sx={{ fontSize: 40 }} />,
      path: '/horas-extra',
      color: 'warning',
      stats: '2h esta semana'
    }
  ];

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',    // ← Centrado horizontal
        justifyContent: 'center', // ← Centrado vertical
        textAlign: 'center'      // ← Centrado del texto
      }}
    >
      {/* Header de bienvenida - CENTRADO */}
      <Box sx={{ 
        mb: 4, 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          mb: 2,
          flexDirection: { xs: 'column', sm: 'row' } // Responsive
        }}>
          <Avatar 
            src={currentUser?.photoURL}
            sx={{ width: 64, height: 64, mr: { xs: 0, sm: 2 }, mb: { xs: 1, sm: 0 } }}
          >
            {(currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U').toUpperCase()}
          </Avatar>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h4" component="h1" color="primary" fontWeight="bold">
              ¡Hola, {currentUser?.displayName?.split(' ')[0] || 'Usuario'}!
            </Typography>
            <Typography variant="h6" color="textSecondary">
              Bienvenido a tu espacio de trabajo
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Notificación - CENTRADA */}
      <Box sx={{ 
        mb: 4, 
        width: '100%', 
        maxWidth: 800,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Card sx={{ 
          bgcolor: 'primary.light', 
          color: 'white', 
          width: '100%',
          maxWidth: 600
        }}>
          <CardContent sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <NotificationsIcon sx={{ mr: 2, fontSize: 32 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Recordatorio
              </Typography>
              <Typography variant="body2">
                No olvides registrar tus horas extra de esta semana
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Título Accesos Rápidos - CENTRADO */}
      <Box sx={{ 
        width: '100%', 
        textAlign: 'center', 
        mb: 3,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Typography variant="h5" color="primary" fontWeight="bold">
          Accesos Rápidos
        </Typography>
      </Box>

      {/* Grid de Cards - CENTRADO */}
      <Box sx={{ 
        width: '100%', 
        maxWidth: 1200,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Grid 
          container 
          spacing={3}
          justifyContent="center"  // ← Centrado de las cards
          alignItems="stretch"     // ← Altura uniforme
        >
          {quickActions.map((action, index) => (
            <Grid size={{ xs:12, sm:6, lg:3 }}  key={index}>
              <Card 
                elevation={4}
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 8,
                    '& .action-icon': {
                      transform: 'scale(1.1)',
                    }
                  },
                  borderRadius: 3,
                  overflow: 'hidden'
                }}
              >
                <CardActionArea 
                  onClick={() => navigate(action.path)}
                  sx={{ height: '100%', p: 0 }}
                >
                  <Box
                    sx={{
                      background: `linear-gradient(135deg, ${
                        action.color === 'secondary' ? '#9c27b0' :
                        action.color === 'success' ? '#2e7d32' :
                        action.color === 'info' ? '#0288d1' :
                        action.color === 'warning' ? '#ed6c02' : '#1976d2'
                      } 0%, ${
                        action.color === 'secondary' ? '#ba68c8' :
                        action.color === 'success' ? '#66bb6a' :
                        action.color === 'info' ? '#29b6f6' :
                        action.color === 'warning' ? '#ff9800' : '#42a5f5'
                      } 100%)`,
                      color: 'white',
                      p: 2,
                      textAlign: 'center'
                    }}
                  >
                    <Box 
                      className="action-icon"
                      sx={{ 
                        transition: 'transform 0.3s ease-in-out',
                        mb: 1 
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Chip 
                      label={action.stats} 
                      size="small" 
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 'bold'
                      }} 
                    />
                  </Box>
                  
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Typography 
                      variant="h6" 
                      component="h3" 
                      gutterBottom 
                      color="primary" 
                      fontWeight="bold"
                    >
                      {action.title}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="textSecondary"
                    >
                      {action.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
