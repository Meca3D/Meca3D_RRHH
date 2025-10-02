
import { 
  Grid, Card, CardContent, Typography, Box, 
  CardActionArea, Container, Fab, Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import { AssessmentOutlined, SettingsOutlined } from '@mui/icons-material';

import { useVacacionesStore } from '../../../stores/vacacionesStore';

const GestionVacaciones = () => {
  const navigate = useNavigate();
  const { solicitudesVacaciones } = useVacacionesStore();
  const pendientes = solicitudesVacaciones.filter(
      (sol) => sol.estado === 'pendiente'
    ).length;

  const quickActions = [
    {
      id: 'pendientes',
      title: 'Solicitudes Pendientes',
      description: 'Vacaciones pendientes de revisar',
      icon: MarkEmailUnreadOutlinedIcon,
      route: '/admin/vacaciones/pendientes',
      color: 'naranja.main',
      bgColor: 'naranja.fondo',
    },
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
      id: 'historial',
      title: 'Historial de Solicitudes',
      description: 'Consulta las solicitudes de los trabajadores',
      icon: EventRepeatOutlinedIcon,
      route: '/admin/vacaciones/historial',
      color: 'azul.main',
      bgColor: 'azul.fondo',
    },
      {
        id: 'saldo',
        title: 'Gestión de Saldo',
        description: 'Ajustar los días de vacaciones de los empleados',
        icon: AccountBalanceOutlinedIcon,
        route: '/admin/vacaciones/saldos', 
        color: 'dorado.main',
        bgColor: 'dorado.fondo',
    },
          {
        id: 'EvoSaldo',
        title: 'Evolución de Saldos',
        description: 'Visualiza la evolucion de las vacaciones de los empleados',
        icon: TrendingDownOutlinedIcon,
        route: '/admin/vacaciones/evolucionsaldos', 
        color: 'rojo.main',
        bgColor: 'rojo.fondo',
    },
/*         {
      id: 'analytics',
      title: 'Estadisticas',
      description: 'Analisis y Estadisticas de Vacaciones',
      icon: AssessmentOutlined,
      route: '/admin/vacaciones/estadisticas',
      color: 'rosa.main',
      bgColor: 'rosa.fondo',
    }, */
  ];

  
  return (
   <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>

      <Paper 
        elevation={5} 
        sx={{ 
          border:'1px solid purpura.main',
          p: 2, 
          mb: 4, 
          bgcolor: 'purpura.fondo', 
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
            bgcolor: 'purpura.fondo',
            zIndex: 0
          }}
        />
        
        <Box display="flex" alignItems="center" gap={2} position="relative" zIndex={1}>
            <BeachAccessOutlinedIcon sx={{ color:'purpura.main', fontSize: '4rem' }} />
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" flexWrap="nowrap">
            <Typography textAlign="center" color="purpura.main" variant="h4" fontWeight="bold" gutterBottom>
              Gestión de Vacaciones
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
           <Typography variant="h6" textAlign="center" color="purpura.main" fontWeight="bold">{}
           </Typography>
           <Typography variant="body1" textAlign="center" color="purpura.main" fontWeight="bold">Solicitudes Pendientes: <strong>{pendientes}</strong>
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

export default GestionVacaciones;
