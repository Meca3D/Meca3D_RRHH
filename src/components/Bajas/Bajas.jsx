// components/Bajas/Bajas.jsx
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Card, CardContent,
  Paper, Chip
} from '@mui/material';

import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentAddIcon from '@mui/icons-material/Assignment';

import { useAuthStore } from '../../stores/authStore';
import { formatearTiempoVacas } from '../../utils/vacacionesUtils';


const Bajas = () => {
  const { userProfile } = useAuthStore();
  const navigate = useNavigate();

/* 
  const quickActions = [
    {
      id: 'crear',
      title: 'Crear Solicitud',
      subtitle: 'Nueva petición',
      description: 'Solicitar días u horas',
      label: 'Nueva',
      icon: AssignmentAddIcon,
      color: 'naranja.main',
      bgColor: 'naranja.fondo',
      route: '/vacaciones/crear'
    },
    {
      id: 'mis-solicitudes',
      title: 'Mis Solicitudes',
      subtitle: 'Historial personal',
      description: 'Ver, editar y eliminar',
      label: 'Gestión',
      icon: HistoryIcon,
      color: 'azul.main',
      bgColor: 'azul.fondo',
      route: '/vacaciones/solicitudes'
    },
    {
      id: 'saldo',
      title: 'Saldo y Movimientos',
      subtitle: 'Horas disponibles',
      description: 'Resumen y movimientos',
      label: 'Saldo',
      icon: TrendingDownIcon,
      color: 'verde.main',
      bgColor: 'verde.fondo',
      route: '/vacaciones/saldo'
    },
    {
      id: 'estadisticas',
      title: 'Estadísticas',
      subtitle: 'Análisis personal',
      description: 'Gráficos y tendencias',
      label: 'Analytics',
      icon: StatsIcon,
      color: 'purpura.main',
      bgColor: 'purpura.fondo',
      route: '/vacaciones/estadisticas'
    }
  ];

 */

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
        <Paper 
        elevation={5} 
        sx={{ 
          background: 'linear-gradient(135deg, #d89393ff 0%, #c86868ff 40%, #a21f1fff 100%)',
          border:'1px solid rojo.main',
          p: 2, 
          mb: 4, 
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          color: 'white',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        
        <Typography variant="h5" fontWeight="700" gutterBottom>
          <AssignmentIcon sx={{ mr: 3, verticalAlign: 'middle', fontSize: '4rem' }} />
          Permisos y Bajas
        </Typography>

          <Grid container spacing={3} sx={{ mt: 1 , justifyContent:'space-around'}}>
            <Grid size={{xs:6}}>
              <Typography textAlign="center" variant="body1" sx={{ opacity: 0.9 }}>
               
              </Typography>
              <Typography textAlign="center" variant="h5" fontWeight="600">
               
              </Typography>
            </Grid>
            <Grid size={{xs:6}}>
              <Typography textAlign="center"variant="body1" sx={{ opacity: 0.9 }}>
                
              </Typography>
              <Typography textAlign="center"variant="h5" fontWeight="600">
                
              </Typography>
            </Grid>
          </Grid>
      </Paper>

      <Card  elevation={5} sx={{p:2,  bgcolor:'azul.fondo'}}>
        <Typography textAlign="center" variant="h6" fontWeight="500">
           Proximamente, creación y gestión de permisos y bajas.    
        </Typography>
      </Card>
{/* 
     
      <Grid container spacing={3}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Grid size={{xs:6 ,sm:3}} key={action.id}>
              <Card
                elevation={5}
                onClick={() => navigate(action.route)}
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'rgba(0,0,0,0.08)',
                  borderRadius: 3,
                  cursor: 'pointer',
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
        </Grid> */}    
        
        </Container>
  );
};
 

export default Bajas;
