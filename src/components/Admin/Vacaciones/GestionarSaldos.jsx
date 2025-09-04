
import { 
  Grid, Card, CardContent, Typography, Box, AppBar, Toolbar, IconButton,
  CardActionArea, Container, Fab, Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditCalendarOutlinedIcon from '@mui/icons-material/EditCalendarOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';

const GestionarSaldos = () => {
  const navigate = useNavigate();


  const quickActions = [
    {
      id: 'individual',
      title: 'Saldos Individuales',
      description: 'Gestiona los saldos individualmente',
      icon: PersonOutlinedIcon,
      route: '/admin/vacaciones/saldos/individual',
      color: 'azul.main',
      bgColor: 'azul.fondo',
    },
    {
        id: 'colectivo',
        title: 'Saldos Colectivos',
        description: 'Gestiona los saldos colectivamente',
        icon: PeopleOutlinedIcon,
        route: '/admin/vacaciones/saldos/colectivo',
        color: 'verde.main',
        bgColor: 'verde.fondo',
    },
  ];

  
  return (
    <>
          <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #6D3B07 0%, #4A2505 50%, #2D1603 100%)',
          boxShadow: '0 2px 10px rgba(109, 59, 7, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          {/* Botón Volver */}
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/admin/vacaciones')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
                transform: 'scale(1.05)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <ArrowBackIosNewIcon />
          </IconButton>

          {/* Título del pedido */}
          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
              }}
            >
              Saldo Vacacional
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Añade o quita Vacaciones
            </Typography>
          </Box>

          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
            <EditCalendarOutlinedIcon
                sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>
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
            <BeachAccessOutlinedIcon sx={{ color:'dorado.main', fontSize: '4rem' }} />
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" flexWrap="nowrap">
            <Typography textAlign="center" color="dorado.main" variant="h4" fontWeight="bold" gutterBottom>
              Saldos Vacacionales
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
           <Typography variant="h6" textAlign="center" color="dorado.main" fontWeight="bold">{}
           </Typography>
           <Typography variant="body1" textAlign="center" color="dorado.main" fontWeight="bold">
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
              </>
            );
          };

export default GestionarSaldos;
