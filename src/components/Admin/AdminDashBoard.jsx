// components/Admin/AdminDashboard.jsx
import React from 'react';
import { 
  Grid, Card, CardContent, Typography, Box, 
  CardActionArea, Container, Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Iconos
import PeopleIcon from '@mui/icons-material/People';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import PaymentIcon from '@mui/icons-material/Payment';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const adminModules = [
    {
      title: 'Gestión de Empleados',
      description: 'Administrar perfiles, roles y datos de empleados',
      icon: <PeopleIcon sx={{ fontSize: 48 }} />,
      path: '/admin/empleados',
      color: 'primary',
      stats: '30 empleados',
      actions: ['Crear', 'Editar', 'Eliminar', 'Lista']
    },
    {
      title: 'Gestión de Desayunos',
      description: 'Administrar productos y pedidos de desayunos',
      icon: <RestaurantIcon sx={{ fontSize: 48 }} />,
      path: '/admin/desayunos',
      color: 'secondary',
      stats: '25 productos',
      actions: ['Crear', 'Modificar', 'Eliminar', 'Lista']
    },
    {
      title: 'Gestión de Nóminas',
      description: 'Configurar salarios y generar nóminas',
      icon: <PaymentIcon sx={{ fontSize: 48 }} />,
      path: '/admin/nominas',
      color: 'success',
      stats: 'Mes actual',
      actions: ['Configurar', 'Generar', 'Historial']
    },
    {
      title: 'Gestión de Vacaciones',
      description: 'Aprobar solicitudes y configurar políticas',
      icon: <BeachAccessIcon sx={{ fontSize: 48 }} />,
      path: '/admin/vacaciones',
      color: 'info',
      stats: '5 pendientes',
      actions: ['Aprobar', 'Políticas', 'Historial']
    },
    {
      title: 'Reportes y Analytics',
      description: 'Estadísticas y reportes empresariales',
      icon: <BarChartIcon sx={{ fontSize: 48 }} />,
      path: '/admin/reportes',
      color: 'warning',
      stats: 'Actualizado',
      actions: ['Dashboard', 'Personal', 'Costos']
    },
    {
      title: 'Configuración General',
      description: 'Ajustes del sistema y permisos',
      icon: <SettingsIcon sx={{ fontSize: 48 }} />,
      path: '/admin/configuracion',
      color: 'error',
      stats: 'Sistema',
      actions: ['Usuarios', 'Permisos', 'Backup']
    }
  ];

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',  // ← Centrado horizontal
        textAlign: 'center'    // ← Centrado del texto
      }}
    >

      <Grid 
        container 
        spacing={3}
        justifyContent="center"  // ← Centrado de las cards
        sx={{ maxWidth: 1200 }}  // ← Ancho máximo para mejor centrado
      >
        {adminModules.map((module, index) => (
          <Grid size={{ xs: 12, sm: 6, lg:4 }} key={index}>
            <Card 
              elevation={6}
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 12,
                  '& .module-icon': {
                    transform: 'scale(1.1)',
                  }
                },
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <CardActionArea 
                onClick={() => navigate(module.path)}
                sx={{ height: '100%', p: 0 }}
              >
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${
                      module.color === 'primary' ? '#1976d2' : 
                      module.color === 'secondary' ? '#9c27b0' :
                      module.color === 'success' ? '#2e7d32' :
                      module.color === 'info' ? '#0288d1' :
                      module.color === 'warning' ? '#ed6c02' : '#d32f2f'
                    } 0%, ${
                      module.color === 'primary' ? '#42a5f5' : 
                      module.color === 'secondary' ? '#ba68c8' :
                      module.color === 'success' ? '#66bb6a' :
                      module.color === 'info' ? '#29b6f6' :
                      module.color === 'warning' ? '#ff9800' : '#f44336'
                    } 100%)`,
                    color: 'white',
                    p: 3,
                    textAlign: 'center'
                  }}
                >
                  <Box 
                    className="module-icon"
                    sx={{ 
                      transition: 'transform 0.3s ease-in-out',
                      mb: 1 
                    }}
                  >
                    {module.icon}
                  </Box>
                  <Chip 
                    label={module.stats} 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 'bold'
                    }} 
                  />
                </Box>
                
                <CardContent sx={{ p: 3, height: 'calc(100% - 140px)' }}>
                  <Typography 
                    variant="h5" 
                    component="h2" 
                    gutterBottom 
                    color="primary" 
                    fontWeight="bold"
                  >
                    {module.title}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="textSecondary" 
                    sx={{ mb: 2, lineHeight: 1.6 }}
                  >
                    {module.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                    {module.actions.map((action, actionIndex) => (
                      <Chip 
                        key={actionIndex}
                        label={action} 
                        size="small" 
                        variant="outlined"
                        color={module.color}
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default AdminDashboard;
