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
     
export default GestionEmpleados;
