// components/Admin/Desayunos/GestionDesayunos.jsx
import React from 'react';
import { 
  Grid, Card, CardContent, Typography, Box, 
  CardActionArea, Container, Fab, Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useGlobalData } from '../../../hooks/useGlobalData';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import FastfoodOutlinedIcon from '@mui/icons-material/FastfoodOutlined';

const GestionDesayunos = () => {
  const navigate = useNavigate();
  const { productsCount } = useGlobalData();

  const quickActions = [
    {
      id: 'crear',
      title: 'Crear Producto',
      description: 'Añadir nuevos productos al menú',
      icon: AddIcon,
      route: '/admin/desayunos/productos/crear',
      color: 'naranja.main',
      bgColor: 'naranja.fondo',
    },
    {
      id: 'modificar',
      title: 'Modificar Productos',
      description: 'Editar productos existentes',
      icon: EditIcon,
      route: '/admin/desayunos/productos/modificar',
      color: 'azul.main',
      bgColor: 'azul.fondo',
    },
    {
      id: 'eliminar',
      title: 'Eliminar Productos',
      description: 'Remover productos del menú',
      icon: DeleteIcon,
      route: '/admin/desayunos/productos/eliminar',
      color: 'rojo.main',
      bgColor: 'rojo.fondo',
    },
  ];

  
  return (
   <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>

      <Paper 
        elevation={5} 
        sx={{ 
          border:'1px solid dorado.main',
          p: 2, 
          mb: 4, 
          bgcolor: 'dorado.fondo', 
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box 
          sx={{
            position: 'absolute',
            top: -50,
            right: -60,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: 'dorado.fondo',
            zIndex: 0
          }}
        />
        
        <Box display="flex" alignItems="center" gap={2} position="relative" zIndex={1}>
            <FastfoodOutlinedIcon sx={{ color:'dorado.main', fontSize: '4rem' }} />
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" flexWrap="nowrap">
            <Typography textAlign="center" color="dorado.main" variant="h4" fontWeight="bold" gutterBottom>
              Productos del Desayuno
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
           <Typography variant="h6" textAlign="center" color="dorado.main" fontWeight="bold">{productsCount}
           </Typography>
           <Typography variant="body1" textAlign="center" color="dorado.main" fontWeight="bold">Productos en la carta
           </Typography>
           </Box>
                         
            </Box>
          </Box>
      </Paper>

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
              </Container>
            );
          };

export default GestionDesayunos;
