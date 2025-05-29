
// components/Admin/Empleados/GestionEmpleados.jsx
import React from 'react';
import { 
  Grid, Card, CardContent, Typography, Box, 
  CardActionArea, Container, Fab
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';

const GestionEmpleados = () => {
  const navigate = useNavigate();

  const empleadosOptions = [
    {
      title: 'Lista de Empleados',
      description: 'Ver todos los empleados registrados',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      path: '/admin/empleados/lista',
      color: 'primary'
    },
    {
      title: 'Crear Empleado',
      description: 'Registrar nuevo empleado en el sistema',
      icon: <PersonAddIcon sx={{ fontSize: 40 }} />,
      path: '/admin/empleados/crear',
      color: 'success'
    },
    {
      title: 'Editar Empleados',
      description: 'Modificar datos de empleados existentes',
      icon: <EditIcon sx={{ fontSize: 40 }} />,
      path: '/admin/empleados/editar',
      color: 'info'
    },
    {
      title: 'Gestión de Roles',
      description: 'Asignar y modificar roles de usuario',
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      path: '/admin/empleados/roles',
      color: 'warning'
    },
    {
      title: 'Eliminar Empleados',
      description: 'Dar de baja empleados del sistema',
      icon: <DeleteIcon sx={{ fontSize: 40 }} />,
      path: '/admin/empleados/eliminar',
      color: 'error'
    }
  ];

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative'
      }}
    >
      {/* Botón de regreso */}
      <Fab 
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1
        }}
        size="small"
        color="secondary"
        onClick={() => navigate('/admin')}
      >
        <ArrowBackIcon />
      </Fab>

      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom color="primary" fontWeight="bold">
          Gestión de Empleados
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Administra perfiles, roles y datos de empleados
        </Typography>
      </Box>

      <Grid 
        container 
        spacing={3}
        justifyContent="center"
        sx={{ maxWidth: 1200 }}
      >
        {empleadosOptions.map((option, index) => (
          <Grid size={{ xs:12, sm:6, md:4 }}  key={index}>
            <Card 
              elevation={6}
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 12,
                  '& .option-icon': {
                    transform: 'scale(1.1)',
                  }
                },
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <CardActionArea 
                onClick={() => navigate(option.path)}
                sx={{ height: '100%', p: 0 }}
              >
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${
                      option.color === 'primary' ? '#1976d2' :
                      option.color === 'success' ? '#2e7d32' :
                      option.color === 'info' ? '#0288d1' :
                      option.color === 'warning' ? '#ed6c02' :
                      option.color === 'error' ? '#d32f2f' : '#1976d2'
                    } 0%, ${
                      option.color === 'primary' ? '#42a5f5' :
                      option.color === 'success' ? '#66bb6a' :
                      option.color === 'info' ? '#29b6f6' :
                      option.color === 'warning' ? '#ff9800' :
                      option.color === 'error' ? '#f44336' : '#42a5f5'
                    } 100%)`,
                    color: 'white',
                    p: 3,
                    textAlign: 'center'
                  }}
                >
                  <Box 
                    className="option-icon"
                    sx={{ 
                      transition: 'transform 0.3s ease-in-out',
                      mb: 1 
                    }}
                  >
                    {option.icon}
                  </Box>
                </Box>
                
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    component="h2" 
                    gutterBottom 
                    color="primary" 
                    fontWeight="bold"
                  >
                    {option.title}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="textSecondary"
                  >
                    {option.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default GestionEmpleados;
