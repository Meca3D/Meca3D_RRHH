
import { 
  Grid, Card, CardContent, Typography, Box, 
  CardActionArea, Container, Fab, Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import DynamicFeedOutlinedIcon from '@mui/icons-material/DynamicFeedOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import { AssessmentOutlined, SettingsOutlined, ThumbDownOutlined } from '@mui/icons-material';
import { useAdminStats } from '../../../hooks/useAdminStats';

const GestionAusencias = () => {
  const navigate = useNavigate();
  const { permisosPendientes } = useAdminStats();


  const quickActions = [
    {
      id: 'pendientes',
      title: 'Permisos Pendientes',
      description: 'Ausencias pendientes de revisar',
      icon: AssignmentLateOutlinedIcon,
      route: '/admin/ausencias/pendientes',
      color: 'purpura.main',
      bgColor: 'purpura.fondo',
    },
    {
      id: 'historial',
      title: 'Historial de Ausencias',
      description: 'Consulta los permisos y bajas de los trabajadores',
      icon: DynamicFeedOutlinedIcon,
      route: '/admin/ausencias/historial',
      color: 'azul.main',
      bgColor: 'azul.fondo',
    },
    {
      id: 'crear',
      title: 'Crear Ausencia',
      subtitle: 'Nueva petición',
      description: 'Solicitar un Permiso o Baja',
      icon: PostAddOutlinedIcon,
      color: 'naranja.main',
      bgColor: 'naranja.fondo',
      route: '/admin/ausencias/crear'
    },
    {
      id: 'penalizacion',
      title: 'Penalizaciones por Bajas',
      subtitle: 'por Bajas',
      description: 'Penalizaciones asociadas a bajas',
      icon: ThumbDownOutlinedIcon,
      color: 'rojo.main',
      bgColor: 'rojo.fondo',
      route: '/admin/ausencias/penalizaciones'
    },
  ];

  
  return (
   <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>

      <Paper 
        elevation={5} 
        sx={{ 
          border:'1px solid purpura.main',
          p: 2, 
          mb: 4, 
          bgcolor: 'naranja.fondo', 
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
            bgcolor: 'naranja.fondo',
            zIndex: 0
          }}
        />
        
        <Box display="flex" alignItems="center" gap={2} position="relative" zIndex={1}>
            <AssignmentOutlinedIcon sx={{ color:'naranja.main', fontSize: '4rem' }} />
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" flexWrap="nowrap">
            <Typography textAlign="center" color="naranja.main" variant="h4" fontWeight="bold" gutterBottom>
              Permisos y Bajas
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
           <Typography variant="h6" textAlign="center" color="naranja.main" fontWeight="bold">{}
           </Typography>
           <Typography variant="body1" textAlign="center" color="naranja.main" fontWeight="bold">Permisos Pendientes: <strong>{permisosPendientes}</strong>
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

export default GestionAusencias;
