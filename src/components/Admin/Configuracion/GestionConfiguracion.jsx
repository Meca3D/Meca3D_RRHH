
import { useEffect } from 'react';
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
import { AssessmentOutlined, SettingsOutlined } from '@mui/icons-material';
import { useAusenciasStore } from '../../../stores/ausenciasStore';
import { useVacacionesStore } from '../../../stores/vacacionesStore';

const GestionConfiguracion = () => {
  const navigate = useNavigate();
  const { configVacaciones,loadConfigVacaciones } = useVacacionesStore();
  const { configAusencias,loadConfigAusencias } = useAusenciasStore();

  // Cargar configuración al montar
  useEffect(() => {
    const unsubVac = loadConfigVacaciones();
    const unsubAus = loadConfigAusencias(); 
    return () => { 
      if (typeof unsubVac === 'function') unsubVac();
      if (typeof unsubAus === 'function') unsubAus(); 
    };
  }, [loadConfigVacaciones, loadConfigAusencias]); 

  const quickActions = [
        {
      id: 'configuracion',
      title: 'Configuración Ausencias',
      description: 'Configura las opciones de vacaciones',
      icon: SettingsOutlined,
      route: '/admin/configuracion/configuracionVacas',
      color: 'rojo.main',
      bgColor: 'rojo.fondo',
    }
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
        
        <Box display="flex" alignItems="center" gap={3} position="relative" zIndex={1}>
          <SettingsOutlined sx={{ color:'purpura.main', fontSize: '4rem' }} />
          <Typography textAlign="center" color="purpura.main" variant="h5" fontWeight="bold" gutterBottom>
            Configuraciones
          </Typography>
        </Box>
            <Box display="flex" justifyContent='space-between' alignItems="center" sx={{mt:2}}>
            <Typography variant="body1" color="purpura.main" fontWeight="600">Auto-Aprobación Permisos:
            </Typography>
            <Typography variant="body1" color="purpura.main" fontWeight="bold">{configAusencias?.autoAprobar?.habilitado ? 'ON' : 'OFF'}
            </Typography>
            </Box>
            <Box display="flex" justifyContent='space-between' alignItems="center" sx={{}}>
            <Typography variant="body1" textAlign="center" color="purpura.main" fontWeight="600">
              Venta de Vacaciones: 
           </Typography>
           <Typography variant="body1" textAlign="center" color="purpura.main" fontWeight="bold">
              {configVacaciones?.ventaVacaciones?.habilitado ? 'ON' : 'OFF'}
           </Typography>
           </Box>
           <Box display="flex" justifyContent='space-between' alignItems="center" sx={{}}>
           <Typography variant="body1" textAlign="center" color="purpura.main" fontWeight="600">Auto-Aprobación Vacaciones:
           </Typography>
           <Typography variant="body1" textAlign="center" color="purpura.main" fontWeight="bold">{configVacaciones?.autoAprobar?.habilitado ? 'ON' : 'OFF'}
           </Typography>
           </Box>
           {configVacaciones?.autoAprobar?.habilitado && (
           <Box display="flex" justifyContent='space-between' alignItems="center" sx={{}}>
           <Typography variant="body2" textAlign="center" color="dorado.main" fontWeight="600" fontStyle='italic'>
            Modo:
           </Typography>
            <Typography variant="body2" textAlign="center" color="dorado.main" fontWeight="600" fontStyle='italic'>
              {configVacaciones.autoAprobar.modo === 'todas' ? 'Todas las solicitudes' :
              configVacaciones.autoAprobar.modo === 'noVentas' ? 'Todas menos las ventas' :
              configVacaciones.autoAprobar.modo === 'porHoras' ? `Solicitudes ≤ ${configVacaciones.autoAprobar.maxHoras} horas` :
              configVacaciones.autoAprobar.modo === 'sinConflictos' ? 'Solo si no hay conflictos de cobertura' :
              configVacaciones.autoAprobar.modo === 'porHorasYsinConflictos' ? `≤ ${configVacaciones.autoAprobar.maxHoras} horas y sin conflictos` :
              ''}
              </Typography>
           </Box>
          )}
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

export default GestionConfiguracion;
