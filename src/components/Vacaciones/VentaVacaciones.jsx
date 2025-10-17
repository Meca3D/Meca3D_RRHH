// components/Vacaciones/VentaVacaciones.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, Alert, CircularProgress, Grid
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  Euro as EuroIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearTiempoVacas, formatearTiempoVacasLargo } from '../../utils/vacacionesUtils';

const VentaVacaciones = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { crearSolicitudVacaciones, configVacaciones, loadConfigVacaciones } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  const [horasAVender, setHorasAVender] = useState('');
  const [saving, setSaving] = useState(false);

  const vacasDisp = userProfile?.vacaciones?.disponibles || 0;
  const vacasPend = userProfile?.vacaciones?.pendientes || 0;
  const horasDisponiblesParaVender = vacasDisp - vacasPend;
  const tarifaHoraExtra = userProfile?.tarifasHorasExtra?.normal || null;

  useEffect(() => {
    if (!configVacaciones) {
    const unsub = loadConfigVacaciones();
    return () => { if (typeof unsub === 'function') unsub(); }}
  }, [configVacaciones, loadConfigVacaciones]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!horasAVender || horasAVender === '' || parseInt(horasAVender) <= 0) {
      showError('Debes especificar una cantidad de horas válida');
      return;
    }

    const horas = parseInt(horasAVender);

    if (horas > horasDisponiblesParaVender) {
      showError(`No puedes vender más horas de las disponibles (${formatearTiempoVacas(horasDisponiblesParaVender)})`);
      return;
    }

    setSaving(true);
    try {
      await crearSolicitudVacaciones({
        solicitante: user.email,
        fechas: [],
        horasSolicitadas: horas,
        esVenta: true,
        cantidadARecibir: tarifaHoraExtra?cantidadARecibir:null,
        comentariosSolicitante: `Me gustaría vender ${formatearTiempoVacasLargo(horas)} de mis vacaciones.`,
      });

      showSuccess((configVacaciones?.autoAprobar?.habilitado===true && configVacaciones?.autoAprobar?.modo==='todas')? 'Solicitud de venta enviada y aprobada' : 'Solicitud de venta enviada correctamente');
      navigate('/vacaciones');
    } catch (err) {
      showError(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const cantidadARecibir = tarifaHoraExtra && horasAVender && parseInt(horasAVender) > 0
    ? Number((parseInt(horasAVender) * tarifaHoraExtra).toFixed(2))
    : null;

  const horasRestantes = horasAVender && parseInt(horasAVender) > 0
    ? horasDisponiblesParaVender - parseInt(horasAVender)
    : horasDisponiblesParaVender;

  return (
    <>
      <AppBar 
         
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)',
          boxShadow: '0 4px 20px rgba(67, 160, 71, 0.3)',
          zIndex: 1100
        }}
      >
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={() => navigate('/vacaciones')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' },
              transition: 'all .3s ease'
            }}>
            <ArrowBackIosNewIcon />
          </IconButton>
          
          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
              }}
            >
              Vender Vacaciones
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Cambia Vacaciones por Dinero
            </Typography>
          </Box>
          <EuroIcon sx={{ fontSize: '2rem' }} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {/* Aviso de horas disponibles */}
          <Alert 
            severity="info" 
            icon={<EuroIcon />}
            sx={{ mb: 3, fontSize: '1rem' }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
              Vacaciones disponibles para vender
            </Typography>
            <Typography  textAlign='center' variant="h6" sx={{  }}>
              {formatearTiempoVacasLargo(horasDisponiblesParaVender)}
            </Typography>
          </Alert>

          {/* Campo de horas a vender */}
          <Card sx={{ mb: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                ¿Cuántas horas deseas vender?
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Horas a vender"
                value={horasAVender}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= horasDisponiblesParaVender)) {
                    setHorasAVender(value);
                  }
                }}
                slotProps={{
                  htmlInput: {
                    min: 0,
                    max: horasDisponiblesParaVender,
                    step: 1
                  }
                }}
                helperText={`Máximo disponible: ${horasDisponiblesParaVender} horas`}
                required
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: 'success.main',
                    },
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Resumen en cards */}
          {horasAVender && parseInt(horasAVender) > 0 && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {/* Card: Horas a vender */}
              <Grid size={{ xs: 6, md: 4 }}>
                <Card 
                  sx={{ 
                    
                    bgcolor: 'success.light', 
                    color: 'success.contrastText',
                    boxShadow: 3,
                    height: '100%'
                  }}
                >
                  <CardContent sx={{px:1,py:1}}>
                    <Typography fontSize='1.1rem'  textAlign='center' sx={{ }}>
                      Vacaciones a Vender
                    </Typography>
                    <Typography variant="h6"  textAlign='center' sx={{ fontWeight: 700, mt: 1 }}>
                      {formatearTiempoVacasLargo(parseInt(horasAVender))}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card: Horas restantes */}
              <Grid size={{ xs: 6, md: 4 }}>
                <Card 
                  sx={{ 
                    bgcolor: 'info.light', 
                    color: 'info.contrastText',
                    boxShadow: 3,
                    height: '100%'
                  }}
                >
                  <CardContent sx={{px:1,py:1}}>
                    <Typography fontSize='1.1rem' textAlign='center' sx={{}}>
                      Vacaciones tras Aprobación
                    </Typography>
                    <Typography variant="h6" textAlign='center' sx={{ fontWeight: 700, mt: 1 }}>
                      {formatearTiempoVacasLargo(horasRestantes)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card: Cantidad a recibir */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card 
                  sx={{ 
                    bgcolor: tarifaHoraExtra ? 'warning.light' : 'grey.100',
                    color: tarifaHoraExtra ? 'warning.contrastText' : 'rojo.main',
                    boxShadow: 3,
                    height: '100%'
                  }}
                >
                  <CardContent>
                    <Typography fontSize='1.1rem'  textAlign='center' sx={{ }}>
                      Dinero a recibir
                    </Typography>
                    {tarifaHoraExtra ? (
                      <Typography variant="h5"  textAlign='center'sx={{ fontWeight: 700, mt: 1 }}>
                        {horasAVender}h x {tarifaHoraExtra}€ = {cantidadARecibir}€
                      </Typography>
                    ) : (
                      <Typography variant="body1"  textAlign='center' sx={{ mt: 1 }}>
                        Configura los datos de horas extra para ver la cantidad. Este dato es solo informativo y no impide enviar la solicitud.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Botón de envío */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={saving || !horasAVender || parseInt(horasAVender) <= 0 || horasDisponiblesParaVender <= 0}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{
              '& .MuiSvgIcon-root': {
                fontSize: '2.5rem'
              },
              fontSize: '1.5rem',
              py: 2,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 15px rgba(67, 160, 71, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #43A047 0%, #388E3C 100%)',
                boxShadow: '0 6px 20px rgba(67, 160, 71, 0.4)',
                transform: 'translateY(-2px)'
              },
              '&:disabled': {
                background: 'linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            {saving ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </Box>
      </Container>
    </>
  );
};

export default VentaVacaciones;
