// components/HorasExtras/HorasExtras.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Card, CardContent, 
  Avatar, Paper, IconButton, Chip,
  Divider
} from '@mui/material';
import {
  Euro as EuroIcon,
  AddCircleOutline as AddIcon,
  EditOutlined as EditIcon,
  PollOutlined as StatsIcon,
  SettingsOutlined as ConfigIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useHorasExtraStore } from '../../stores/horasExtraStore';
import { formatCurrency, formatearTiempo } from '../../utils/nominaUtils';

const HorasExtras = () => {
  const navigate = useNavigate();
  const { horasExtra, calcularTotalHorasDecimales, calcularTotalHorasExtra } = useHorasExtraStore();

    const totalHorasEsteMes = calcularTotalHorasDecimales(horasExtra);
    const totalImporteEsteMes = calcularTotalHorasExtra(horasExtra);
    const horasFormateadas = Math.floor(totalHorasEsteMes);
    const minutosFormateados = Math.round((totalHorasEsteMes % 1) * 60);

  // ✅ Configuración de las 4 cards principales
  const quickActions = [
    {
      id: 'registrar',
      title: 'Registrar Horas Extras',
      subtitle: '',
      icon: AddIcon,
      color: 'naranja.main',
      bgColor: 'naranja.fondo',
      route: '/horas-extras/registrar'
    },
    {
      id: 'gestionar',
      title: 'Gestionar Horas Extras',
      subtitle: '',
      icon: EditIcon,
      color: 'azul.main',
      bgColor: 'azul.fondo',
      route: '/horas-extras/gestionar'
    },
    {
      id: 'estadisticas',
      title: 'Analisis y Estadísticas',
      subtitle: '',
      icon: StatsIcon,
      color: 'verde.main',
      bgColor: 'verde.fondo',
      route: '/horas-extras/estadisticas'
    },
    {
      id: 'configuracion',
      title: 'Configuración de Tarifas',
      subtitle: '',
      icon: ConfigIcon,
      color: 'purpura.main',
      bgColor: 'purpura.fondo',
      route: '/horas-extras/configuracion'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header corporativo */}
      <Paper 
        elevation={5} 
        sx={{ 
          border:'1px solid naranja.main',
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
            right: -50,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: 'naranja.fondo',
            zIndex: 0
          }}
        />
        
        <Box display="flex" alignItems="center" gap={3} position="relative" zIndex={1}>

            <TimeIcon sx={{ color:'naranja.main', fontSize: '4rem' }} />

          <Box flex={1}>
            <Typography sx={{ml:-5}} color='naranja.main' variant="h4"  textAlign="center" fontWeight="bold" gutterBottom>
              Horas Extras
            </Typography>
            <Box display="flex" flexDirection="column" alignContent="center" flexWrap="wrap" sx={{mr:7}}>
            <Typography  width="5rem" bgcolor="naranja.fondo" color="naranja.main" variant="h6" fontSize=" 1rem" textAlign='center' lineHeight={1.2} fontWeight="bold" >
              Este Mes

            </Typography>
              <Typography textAlign="center" color="naranja.main"><strong>{formatearTiempo(horasFormateadas, minutosFormateados)}</strong></Typography>
              
              <Typography textAlign="center" color="naranja.main"><strong>{formatCurrency(totalImporteEsteMes)}</strong></Typography>

            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Grid de acciones principales */}
      <Grid container spacing={3}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Grid size={{xs:6 ,md:3}}  key={action.id}>
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
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{mt:1}} display="flex" justifyContent="center" alignItems="flex-start"  mb={2}>
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

export default HorasExtras;
