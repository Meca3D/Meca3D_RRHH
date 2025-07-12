// components/Admin/Empleados/GestionEmpleados.jsx - ESTILO IDÉNTICO A HORAS EXTRAS
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Card, CardContent, 
  Avatar, Paper, Chip, Divider
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  EditOutlined as EditIcon,
  PollOutlined as StatsIcon,
  People as PeopleIcon,
  DeleteForeverOutlined as DeleteForeverOutlinedIcon,
} from '@mui/icons-material';

const GestionEmpleados = () => {
  const navigate = useNavigate();


  const quickActions = [
    {
      id: 'crear',
      title: 'Crear Empleado',
      subtitle: '',
      icon: PersonAddIcon,
      color: 'verde.main',
      bgColor: 'verde.fondo',
      route: '/admin/empleados/crear'
    },
    {
      id: 'editar', 
      title: 'Editar Empleado',
      subtitle: '',
      icon: EditIcon,
      color: 'azul.main',
      bgColor: 'azul.fondo', 
      route: '/admin/empleados/editar'
    },
    {
      id: 'borrar',
      title: 'Eliminar Empleado',
      subtitle: '',
      icon: DeleteForeverOutlinedIcon,
      color: 'rojo.main',
      bgColor: 'rojo.fondo',
      route: '/admin/empleados/eliminar'
    },

  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header corporativo igual que HorasExtras */}
      <Paper 
        elevation={5} 
        sx={{ 
          p: 2, 
          mb: 4, 
          bgcolor: 'azul.fondo', // Azul en lugar de naranja
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decoración de fondo idéntica */}
        <Box 
          sx={{
            position: 'absolute',
            top: -50,
            right: -55,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: 'azul.fondoFuerte',
            zIndex: 0
          }}
        />
        
        <Box display="flex" alignItems="center" gap={3} position="relative" zIndex={1}>
            <PeopleIcon sx={{ color:'azul.main', fontSize: '4rem' }} />
          <Box flex={1}>
            <Typography color="azul.main" variant="h4" fontWeight="bold" gutterBottom>
              Gestión de Empleados
            </Typography>
           <Typography textAlign="center" color="naranja.main"><strong>{}</strong>
           </Typography>
                         
            </Box>
          </Box>
      </Paper>

     <Grid container spacing={3}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Grid size={{xs:6 ,md:3}}  key={action.id}>
              <Card 
                elevation={5}
      sx={{ 
        cursor: 'pointer',
        bgcolor: action.bgColor,
        border: '1px solid',
        borderRadius: 3,
        minHeight: 100,
        borderColor: 'rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)',
          borderColor: action.color
        }
      }}
                onClick={() => navigate(action.route)}
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
                    <Icon sx={{  mb:2, fontSize: '30', color: action.color }} />

                  <Typography variant="body1" fontWeight="600" sx={{ color:action.color, lineHeight: 1.2 }}>
                    {action.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default GestionEmpleados;
