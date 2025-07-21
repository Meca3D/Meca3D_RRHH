// components/Nominas/Nominas.jsx
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Card, CardContent, 
  Paper, Chip
} from '@mui/material';
import {
  SettingsOutlined as SettingsIcon,
  HistoryOutlined as HistoryIcon,
  ReceiptOutlined as ReceiptIcon,
  CardGiftcardOutlined as GiftIcon,
  AssessmentOutlined as AssessmentIcon,
  WysiwygOutlined as WysiwygOutlinedIcon,
  EditOutlined as EditIcon,
  PostAddOutlined as AddIcon
} from '@mui/icons-material';
import { useGlobalData } from '../../hooks/useGlobalData';
import { formatCurrency } from '../../utils/nominaUtils';

const Nominas = () => {
  const navigate = useNavigate();
  const { userSalaryInfo } = useGlobalData();

  // ✅ 5 opciones del menú principal
  const quickActions = [
    {
      id: 'generar',
      title: 'Generar Nómina',
      subtitle: 'Del mes actual',
      description: 'Calcular y guardar',
      label:"Automático",
      icon: AddIcon,
      color: 'naranja.main',
      bgColor: 'naranja.fondo',
      route: '/nominas/generar'
    },
    {
      id: 'gestionar',
      title: 'Gestionar Nóminas',
      subtitle: 'Histórico pasadas',
      description: 'Editar y Borrar nóminas',
      label:"Histórico",
      icon: EditIcon,
      color: 'azul.main',
      bgColor: 'azul.fondo',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      route: '/nominas/gestionar'
    },
    {
      id: 'resumen',
      title: 'Estadísticas',
      subtitle: 'Analytics y totales',
      description: 'Estadísticas del año',
      label: 'Totales',
      icon: AssessmentIcon,
      color: 'verde.main',
      bgColor: 'verde.fondo',
      gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
      route: '/nominas/resumen'
    },
    {
      id: 'configurar',
      title: 'Configurar Datos',
      subtitle: 'Salariales del año',
      description: 'Sueldo base y complementos',
      label:userSalaryInfo?.isConfigured ? "Configurado" : "Configurar",
      icon: SettingsIcon,
      color: 'purpura.main',
      bgColor: 'purpura.fondo',
      gradient: 'linear-gradient(135deg, #FB8C00 0%, #F57C00 100%)',
      route: '/nominas/configurar'
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header corporativo con gradiente dorado */}
      <Paper 
        elevation={5} 
        sx={{ 
          border:'1px solid verde.main',
          p: 2, 
          mb: 4, 
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decoración de fondo */}
        <Box 
          sx={{
            position: 'absolute',
            top: -50,
            right: -60,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: 'verde.fondo',
            zIndex: 0
          }}
        />
        
        <Box display="flex" alignItems="center" gap={2} position="relative" zIndex={1}>
            <WysiwygOutlinedIcon sx={{ fontSize: '4rem', color:'verde.main'}} />
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" flexWrap="nowrap" sx={{ml:-5}}>
            <Typography sx={{ color:'verde.main'}} textAlign="center" variant="h4" fontWeight="bold" gutterBottom>
              Gestión de Nóminas
            </Typography>
            <Box display="flex" gap={1} flexWrap="nowrap">
              {userSalaryInfo.salarioCompletoEstimado ? (
                <>
                  <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" flexWrap="nowrap" sx={{px:5}}>
                  <Typography  color="verde.main" variant="h6" fontSize=" 1rem" textAlign="center" fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
                    Estimado {userSalaryInfo.mesNomina || 'Mes Actual'}   
                  </Typography>
                  <Typography textAlign="center" color="verde.main"><strong>{formatCurrency(userSalaryInfo.salarioCompletoEstimado)}</strong></Typography>
                  </Box>
                </>
              ) : (
                <Chip 
                  label="Falta configuración"
                  sx={{ 
                    bgcolor: 'rojo.fondo', 
                    color: 'rojo.main',
                    fontWeight: 700
                  }} 
                />
              )}
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

export default Nominas;
