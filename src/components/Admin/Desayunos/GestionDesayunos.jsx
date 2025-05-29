// components/Admin/Desayunos/GestionDesayunos.jsx
import React from 'react';
import { 
  Grid, Card, CardContent, Typography, Box, 
  CardActionArea, Container, Fab
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';

const GestionDesayunos = () => {
  const navigate = useNavigate();

  const desayunosOptions = [
    {
      title: 'Crear Producto',
      description: 'Añadir nuevos productos al menú',
      icon: <AddIcon sx={{ fontSize: 40 }} />,
      path: '/admin/desayunos/productos/crear',
      color: 'success'
    },
    {
      title: 'Modificar Productos',
      description: 'Editar productos existentes',
      icon: <EditIcon sx={{ fontSize: 40 }} />,
      path: '/admin/desayunos/productos/modificar',
      color: 'primary'
    },
    {
      title: 'Eliminar Productos',
      description: 'Remover productos del menú',
      icon: <DeleteIcon sx={{ fontSize: 40 }} />,
      path: '/admin/desayunos/productos/eliminar',
      color: 'error'
    },
    {
      title: 'Ver Todos los Productos',
      description: 'Lista completa de productos disponibles',
      icon: <RestaurantMenuIcon sx={{ fontSize: 40 }} />,
      path: '/admin/desayunos/productos/lista',
      color: 'info'
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
          top: 1,
          left: 1,
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
          Gestión de Desayunos
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Administra productos y configuración de desayunos
        </Typography>
      </Box>

      <Grid 
        container 
        spacing={3}
        justifyContent="center"
        sx={{ maxWidth: 1000 }}
      >
        {desayunosOptions.map((option, index) => (
          <Grid size={{ xs:12, sm:6, md:3}} key={index}>
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
                      option.color === 'success' ? '#2e7d32' :
                      option.color === 'primary' ? '#1976d2' :
                      option.color === 'error' ? '#d32f2f' :
                      option.color === 'info' ? '#0288d1' : '#1976d2'
                    } 0%, ${
                      option.color === 'success' ? '#66bb6a' :
                      option.color === 'primary' ? '#42a5f5' :
                      option.color === 'error' ? '#f44336' :
                      option.color === 'info' ? '#29b6f6' : '#42a5f5'
                    } 100%)`,
                    color: 'white',
                    p: 2,
                    textAlign: 'center'
                  }}
                >
                  <Box 
                    className="option-icon"
                    sx={{ 
                      transition: 'transform 0.3s ease-in-out',
                      mb: 0 
                    }}
                  >
                    {option.icon}
                  </Box>
                </Box>
                
                <CardContent sx={{ p: 2 }}>
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

export default GestionDesayunos;
