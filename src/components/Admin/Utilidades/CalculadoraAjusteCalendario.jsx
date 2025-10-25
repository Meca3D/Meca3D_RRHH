// components/Admin/Utilidades/CalculadoraAjusteCalendario.jsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, FormControl, InputLabel, Select, MenuItem, DialogActions,
  TextField, Grid, CircularProgress, Alert, Divider, Dialog, DialogTitle, DialogContent
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  CalendarMonth as CalendarMonthIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useUIStore } from '../../../stores/uiStore';
import { formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';
import { formatearFechaEspanol2 } from '../../../utils/dateUtils';

const CalculadoraAjusteCalendario = () => {
  const navigate = useNavigate();
  
  const {
    festivos,
    loadFestivos,
    calcularDiasLaborables,
    obtenerCalculoExcesoJornada,
    guardarCalculoExcesoJornada
  } = useVacacionesStore();

  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());
  const [horasConvenio, setHorasConvenio] = useState('');
  const [calculoActual, setCalculoActual] = useState(null);
  const [loading, setLoading] = useState(false);
  const [yaCalculado, setYaCalculado] = useState(false);
  const [dialogFestivos, setDialogFestivos] = useState(false);
  const [festivosDelAño, setFestivosDelAño] = useState([]);

  // Calcular festivos del año seleccionado
  const festivosAñoActual = useMemo(() => {
  return festivos.filter(f => f.fecha && f.fecha.startsWith(añoSeleccionado.toString()));
}, [festivos, añoSeleccionado]);


  // Cargar festivos y verificar si ya hay cálculo al cambiar año
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setCalculoActual(null);
      setYaCalculado(false);
      setHorasConvenio('');

      // Cargar festivos
       const unsubscribe = loadFestivos();

      // Verificar si ya hay cálculo guardado
      try {
        const calculoPrevio = await obtenerCalculoExcesoJornada(añoSeleccionado);
        if (calculoPrevio) {
          setCalculoActual(calculoPrevio);
          setYaCalculado(true);
          setHorasConvenio(calculoPrevio.horasConvenio.toString());
        }
      } catch (error) {
        console.error('Error verificando cálculo previo:', error);
      }

      setLoading(false);
      return unsubscribe;
    };

    let cleanup;
    cargarDatos().then(unsubscribe => {
      cleanup = unsubscribe;
    });

    return () => cleanup && cleanup();
  }, [añoSeleccionado, loadFestivos, obtenerCalculoExcesoJornada]);

  // Generar opciones de años
  const añosParaSelector = () => {
    const añoActual = new Date().getFullYear();
    const años = [];
    for (let i = añoActual - 5; i <= añoActual + 5; i++) {
      años.push(i);
    }
    return años;
  };

  // Realizar cálculo
  const handleCalcular = async () => {
    const horas = parseFloat(horasConvenio);

    if (isNaN(horas) || horas <= 0) {
      showError('Introduce un número válido de horas');
      return;
    }

    setLoading(true);

    try {
      // 1. Calcular días laborables del año
      const diasLaborables = calcularDiasLaborables(añoSeleccionado, festivos);

      setFestivosDelAño(festivosAñoActual);
      
      // 2. Calcular horas disponibles totales
      const horasDisponiblesTotales = diasLaborables * 8;
      
      // 3. Calcular horas excedentes
      const horasExcedentes = horasDisponiblesTotales - horas;
      
      // 4. Validar que hay al menos 22 días de excedente
      const diasExcedentes = horasExcedentes / 8;
      
      if (diasExcedentes < 22) {
        showError(
          'Error: Las horas de convenio introducidas son incorrectas. ' +
          'Debe haber un mínimo de 22 días de excedente (vacaciones). ' +
          'Revisa la cantidad de horas del convenio.'
        );
        setLoading(false);
        return;
      }
      
      // 5. Calcular vacaciones y ajuste de calendario
      const horasVacaciones = 22 * 8; // 176 horas
      const horasAjusteCalendario = horasExcedentes - horasVacaciones;
      
      // 6. Preparar datos para guardar
      const datosCalculo = {
        diasLaborablesAño: diasLaborables,
        horasDisponiblesTotales: horasDisponiblesTotales,
        horasConvenio: horas,
        horasVacaciones: horasVacaciones,
        horasAjusteCalendario: horasAjusteCalendario
      };
      
      // 7. Guardar en Firestore
      await guardarCalculoExcesoJornada(añoSeleccionado, datosCalculo);
      
      // 8. Actualizar estado
      setCalculoActual({
        ...datosCalculo,
        fechaCalculo: new Date(),
      });
      setYaCalculado(true);
      
      showSuccess(`Cálculo para ${añoSeleccionado} guardado correctamente`);
      
    } catch (error) {
      showError('Error al realizar el cálculo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Recalcular (permite calcular de nuevo un año ya calculado)
  const handleRecalcular = () => {
    setYaCalculado(false);
    setCalculoActual(null);
  };

  const handleVerFestivos = () => {
    setDialogFestivos(true);
    };

  return (
    <>
      <AppBar  
             sx={{ 
                 overflow:'hidden',
                 background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #1E40AF 100%)',
               boxShadow: '0 2px 10px rgba(59, 130, 246, 0.2)',
               zIndex: 1100
             }}
           >
             <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
               <IconButton
                 edge="start"
                 color="inherit"
                 onClick={() => navigate('/admin/utilidades')}
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
     
          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
                      <Typography 
                        variant="h5" 
                        fontWeight="bold" 
                        sx={{ 
                          fontSize: { xs: '1.1rem', sm: '1.3rem' },
                          lineHeight: 1.2
                        }}
                      >
                        Ajuste de Calendario
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                            opacity: 0.9,
                            fontSize: { xs: '0.9rem', sm: '1rem' }
                        }}
                        >
                        Calcula el exceso de jornada anual
                        </Typography>
                    </Box>
            
                    <IconButton
                        edge="end"
                        color="inherit"
                        sx={{
                        cursor: 'default'
                        }}
                    >
          <CalendarMonthIcon sx={{ fontSize: '2rem' }} />
          </IconButton>
        </Toolbar>
      </AppBar>

<Container maxWidth="lg" sx={{ pb: 3, mt: 2 }}>
      {/* Selector de año */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <InputLabel>Año</InputLabel>
            <Select
              value={añoSeleccionado}
              onChange={(e) => setAñoSeleccionado(e.target.value)}
              label="Año"
              disabled={loading}
            >
              {añosParaSelector().map(año => (
                <MenuItem key={año} value={año}>{año}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {loading && !calculoActual ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando datos...</Typography>
        </Box>
      ) : (
        <>
          {/* Formulario de cálculo */}
          {!yaCalculado && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Datos para el cálculo
                </Typography>
                
                <TextField
                  fullWidth
                  label="Horas de convenio anuales"
                  type="number"
                  value={horasConvenio}
                  onChange={(e) => setHorasConvenio(e.target.value)}
                  placeholder="Ej: 1650"
                  inputProps={{ step: "1", min: "0" }}
                  helperText="Introduce las horas anuales según convenio"
                  sx={{ mb: 3 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CalculateIcon />}
                  onClick={handleCalcular}
                  disabled={!horasConvenio || loading}
                  sx={{
                    bgcolor: 'verde.main',
                    py: 1.5,
                    '&:hover': {
                      bgcolor: 'verde.oscuro'
                    }
                  }}
                >
                  Calcular
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Resultados */}
          {calculoActual && (
            <>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Resultados {añoSeleccionado}
                    </Typography>
                    {yaCalculado && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleRecalcular}
                        sx={{ color: 'azul.main', borderColor: 'azul.main' }}
                      >
                        Recalcular
                      </Button>
                    )}
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Datos básicos */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box textAlign='center' sx={{ p: 2, bgcolor: 'azul.fondo', borderRadius: 2 }}>
                        <Typography variant="body1"  color="text.secondary">
                          Días laborables en {añoSeleccionado}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'azul.main' }}>
                          {calculoActual.diasLaborablesAño} días
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box textAlign='center'sx={{ p: 2, bgcolor: 'azul.fondo', borderRadius: 2 }}>
                        <Typography variant="body1" color="text.secondary">
                          Horas disponibles totales
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'azul.main' }}>
                          {calculoActual.horasDisponiblesTotales} h
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box textAlign='center' sx={{ p: 2, bgcolor: 'amarillo.fondofuerte', borderRadius: 2 }}>
                        <Typography variant="body1" color="text.secondary">
                          Horas de convenio
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {calculoActual.horasConvenio} h
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ mb: 2 }} />

                  {/* Resultados finales */}
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Distribución de días libres:
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ p: 2, bgcolor: 'verde.fondo', borderRadius: 2, border: '2px solid', borderColor: 'verde.main' }}>
                        <Typography variant="body1" textAlign='center' color="text.secondary" sx={{ fontWeight: 600 }}>
                          Vacaciones anuales
                        </Typography>
                        <Typography variant="h4" textAlign='center' sx={{ fontWeight: 700, color: 'verde.main', mt: 1 }}>
                          {formatearTiempoVacasLargo(calculoActual.horasVacaciones)}
                        </Typography>
                        <Typography variant="body2" textAlign='center' color="text.secondary">
                          ({calculoActual.horasVacaciones} horas)
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ p: 2, bgcolor: 'rojo.fondo', borderRadius: 2, border: '2px solid', borderColor: 'rojo.main' }}>
                        <Typography variant="body1" color="text.secondary" textAlign='center' sx={{ fontWeight: 600 }}>
                          Ajuste de calendario
                        </Typography>
                        <Typography variant="h4" textAlign='center' sx={{ fontWeight: 700, color: 'rojo.main', mt: 1 }}>
                          {formatearTiempoVacasLargo(calculoActual.horasAjusteCalendario)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" textAlign='center'>
                          ({calculoActual.horasAjusteCalendario} horas)
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {calculoActual.fechaCalculo && (
                    <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">
                        Calculado el: {new Date(calculoActual.fechaCalculo.seconds * 1000 || calculoActual.fechaCalculo).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Card elevation={5} onClick={handleVerFestivos} sx={{bgcolor:'azul.fondo', p:2, mb:2, textAlign:'center'}}>
                <Typography variant="body1">
                    El cálculo está basado en los días festivos configurados para {añoSeleccionado} (
                    <span 
                    onClick={handleVerFestivos}
                    style={{ 
                        color: 'black', 
                        textDecoration: 'underline', 
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                    >
                    {festivosAñoActual.length} festivos
                    </span>
                    ) 
                </Typography>
                </Card>

                {/* Dialog lista de festivos */}
                <Dialog
                open={dialogFestivos}
                onClose={() => setDialogFestivos(false)}
                maxWidth="sm"
                fullWidth
                >
                <DialogTitle>
                    Días Festivos {añoSeleccionado}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                    {festivosAñoActual.length === 0 ? (
                        <Alert severity="warning">
                        No hay festivos configurados para {añoSeleccionado}
                        </Alert>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {festivosAñoActual
                            .sort((a, b) => a.fecha.localeCompare(b.fecha))
                            .map((festivo, index) => (
                            <Box
                                key={index}
                                sx={{
                                p: 2,
                                bgcolor: 'var(--color-bg-1)',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'var(--color-border)'
                                }}
                            >
                                <Typography variant="body1" sx={{ fontWeight: 600, color: 'rojo.main' }}>
                                    {formatearFechaEspanol2(festivo.fecha)}
{/*                                 {new Date(festivo.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'long',
                                    weekday: 'long',
                                })} */}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                {festivo.nombre}
                                </Typography>
                            </Box>
                            ))}
                        </Box>
                    )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                    onClick={() => setDialogFestivos(false)}
                    variant="contained"
                    sx={{ bgcolor: 'azul.main', py: 1 }}
                    >
                    Cerrar
                    </Button>
                </DialogActions>
                </Dialog>


            </>
          )}
        </>
      )}
    </Container>
    </>
  );
};

export default CalculadoraAjusteCalendario;
