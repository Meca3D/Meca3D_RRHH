// components/Admin/Ausencias/PenalizacionBajas.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, FormControl, InputLabel, Select, MenuItem, Grid,
  Table, TableHead, TableRow, TableCell, TableBody, Button,
  CircularProgress, Alert, Chip, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider
} from '@mui/material';
import {
  ArrowBackIosNew,
  ThumbDownOutlined as ThumbDownOutlinedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAusenciasStore } from '../../../stores/ausenciasStore';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useEmpleadosStore } from '../../../stores/empleadosStore';
import { useUIStore } from '../../../stores/uiStore';
import { formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';

const PenalizacionBajas = () => {
  const navigate = useNavigate();
  const { ausencias, loadAusencias, guardarPenalizacion, loadPenalizacionesYear} = useAusenciasStore();
  const { ajustarSaldoIndividual, obtenerCalculoExcesoJornada } = useVacacionesStore();
  const { empleados, fetchEmpleados } = useEmpleadosStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());
  const [excesoJornada, setExcesoJornada] = useState(null);
  const [penalizacionesPrevias, setPenalizacionesPrevias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [empleadosConBajas, setEmpleadosConBajas] = useState([]);
  
  // Dialog confirmación
  const [dialogOpen, setDialogOpen] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const unsubAusencias = loadAusencias();
        const unsubEmpleados = fetchEmpleados();

        return () => {
          if (typeof unsubAusencias === 'function') unsubAusencias();
          if (typeof unsubEmpleados === 'function') unsubEmpleados();
        };
      } catch (error) {
        showError('Error cargando datos: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

    // Cargar exceso de jornada y escuchar penalizaciones cuando cambia el año
    useEffect(() => {
    if (!añoSeleccionado) return;

    let unsubscribePenalizaciones;

    const cargarDatosAño = async () => {
        setCalculando(true);
        try {
        // Cargar exceso jornada del año
        const excesoDoc = await obtenerCalculoExcesoJornada(añoSeleccionado);
        if (excesoDoc && excesoDoc.horasAjusteCalendario) {
            setExcesoJornada(excesoDoc.horasAjusteCalendario);
        } else {
            setExcesoJornada(null);
            showError(`No hay datos de exceso de jornada para ${añoSeleccionado}`);
        }

        // Escuchar penalizaciones del año (onSnapshot)
        unsubscribePenalizaciones = loadPenalizacionesYear(añoSeleccionado, (penalizaciones) => {
            setPenalizacionesPrevias(penalizaciones);
        });

        } catch (error) {
        showError('Error cargando datos del año: ' + error.message);
        } finally {
        setCalculando(false);
        }
    };

    cargarDatosAño();

    // Cleanup del listener
    return () => {
        if (typeof unsubscribePenalizaciones === 'function') {
        unsubscribePenalizaciones();
        }
    };
    }, [añoSeleccionado]);


  // Calcular empleados con bajas
  useEffect(() => {
    if (!ausencias.length || !empleados.length || !excesoJornada) {
      setEmpleadosConBajas([]);
      return;
    }

    calcularEmpleadosConBajas();
  }, [ausencias, empleados, añoSeleccionado, excesoJornada, penalizacionesPrevias]);

  const calcularEmpleadosConBajas = () => {
    const resultados = empleados.map(empleado => {
      // 1. Contar días de baja del año (solo fechasActuales del año seleccionado)
      const diasBajaTotales = ausencias
        .filter(a => 
          a.solicitante === empleado.email &&
          a.tipo === 'baja' &&
          (a.estado === 'aprobado' || a.estado === 'cancelado')
        )
        .reduce((total, ausencia) => {
          const diasEnAnio = ausencia.fechasActuales.filter(fecha => {
            const year = new Date(fecha).getFullYear();
            return year === añoSeleccionado;
          }).length;
          return total + diasEnAnio;
        }, 0);

      // 2. Calcular porcentaje de penalización
      let porcentaje = 0;
      if (diasBajaTotales <= 7) porcentaje = 0;
      else if (diasBajaTotales <= 14) porcentaje = 0.25;
      else if (diasBajaTotales <= 21) porcentaje = 0.5;
      else if (diasBajaTotales <= 28) porcentaje = 0.75;
      else porcentaje = 1.0;

      // 3. Calcular penalización en horas (redondear hacia abajo)
      const penalizacionHoras = Math.floor(excesoJornada * porcentaje);

      // 4. Obtener penalización previa
      const penalizacionPrevia = penalizacionesPrevias.find(p => p.email === empleado.email);
      const penalizacionPreviaHoras = penalizacionPrevia?.penalizacionAplicada || 0;

      // 5. Calcular diferencia a aplicar
      const diferencia = penalizacionHoras - penalizacionPreviaHoras;
      return {
        email: empleado.email,
        nombre: empleado.nombre,
        puesto: empleado.puesto,
        diasBajaTotales,
        porcentaje,
        penalizacionHoras,
        penalizacionPreviaHoras,
        diferencia,
        vacacionesDisponibles: empleado.vacaciones?.disponibles || 0
      };
    })
    .filter(e => e.diasBajaTotales > 7) // Solo mostrar con más de 7 días
    .sort((a, b) => b.diasBajaTotales - a.diasBajaTotales); // Ordenar por días de baja (mayor a menor)

    setEmpleadosConBajas(resultados);
  };

  const handleAbrirDialog = (empleado) => {
    setEmpleadoSeleccionado(empleado);
    setDialogOpen(true);
  };

  const handleAplicarPenalizacion = async () => {
    if (!empleadoSeleccionado) return;

    const { email, nombre, diasBajaTotales, penalizacionHoras, diferencia, porcentaje } = empleadoSeleccionado;

    if (diferencia <= 0) {
      showError('No hay diferencia que aplicar');
      setDialogOpen(false);
      return;
    }

    try {
      setCalculando(true);

      // 1. Aplicar penalización usando ajustarSaldoIndividual
      await ajustarSaldoIndividual(
        email,
        'reducir',
        diferencia,
        `Penalización por ${diasBajaTotales} días de baja en ${añoSeleccionado} (${porcentaje * 100}% del exceso jornada anual)`,
      );

      // 2. Guardar registro en PENALIZACIONES
      await guardarPenalizacion(añoSeleccionado, email, diasBajaTotales, penalizacionHoras);
      showSuccess(`Penalización de ${formatearTiempoVacasLargo(diferencia)} aplicada a ${nombre} correctamente`);
      // Recargar penalizaciones
      setDialogOpen(false);
      setEmpleadoSeleccionado(null);
    } catch (error) {
      showError('Error al aplicar penalización: ' + error.message);
    } finally {
      setCalculando(false);
    }
  };

  const añosDisponibles = useMemo(() => {
    const añoActual = new Date().getFullYear();
    const años = [];
    for (let i = añoActual; i >= añoActual - 5; i--) {
      años.push(i);
    }
    return años;
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={60} sx={{ color: '#ee2121ff' }} />
        <Typography variant="h6" ml={2}>Cargando datos...</Typography>
      </Box>
    );
  }

  return (
    <>
           <AppBar  
              sx={{ 
                  overflow:'hidden',
                  background: 'linear-gradient(135deg, #ec5858ff 0%, #e03535ff 50%, #c23636ff 100%)',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
                  zIndex: 1100
              }}
              >
              <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
                  <IconButton
                  edge="start"
                  color="inherit"
                  onClick={() => navigate('/admin/ausencias')}
                  sx={{
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)',
                      transform: 'scale(1.05)'
                      },
                      transition: 'all 0.3s ease'
                  }}
                  >
                  <ArrowBackIosNew />
                  </IconButton>
      
                  {/* Título */}
                  <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
                  <Typography 
                      variant="h5" 
                      fontWeight="bold" 
                      sx={{ 
                      fontSize: { xs: '1.1rem', sm: '1.3rem' },
                      lineHeight: 1.2
                      }}
                  >
                      Penalizaciones
                  </Typography>
                  <Typography 
                      variant="caption" 
                      sx={{ 
                      opacity: 0.9,
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                      }}
                  >
                      por exceso de bajas anuales
                  </Typography>
                  </Box>
                  <IconButton
                  edge="end"
                  color="inherit"
                  sx={{
                      cursor: 'default'
                  }}
                  >
                  <ThumbDownOutlinedIcon sx={{fontSize:'2rem'}}/>
                  </IconButton>
              </Toolbar>
              </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>

        {/* Selector de año */}
          <Card elecation={5} sx={{p:2,mb:2}}>
            <Typography variant="h6" textAlign='center' fontWeight={700} mb={0.5} color="rojo.main">
            Selecciona el año
            </Typography>
            <FormControl fullWidth sx={{mb:2}}>
              <InputLabel>Año</InputLabel>
              <Select
                value={añoSeleccionado}
                onChange={(e) => setAñoSeleccionado(e.target.value)}
                label="Año"
              >
                {añosDisponibles.map(año => (
                  <MenuItem key={año} value={año}>{año}</MenuItem>
                ))}
              </Select>
            </FormControl>

          {excesoJornada && (
            <Grid size={{ xs: 12, md: 8 }}>
              <Alert severity="info" icon={<InfoIcon />}>
                <Typography variant="body1" textAlign='center'>
                  <strong>Exceso de jornada {añoSeleccionado}:<br/></strong> {formatearTiempoVacasLargo(excesoJornada)}
                </Typography>
              </Alert>
            </Grid>
          )}
        </Card>

        {/* Tabla de información de penalización */}
        <Card elevation={2} sx={{ mb: 3, bgcolor: '' }}>
          <CardContent>
            <Typography variant="h6" textAlign='center' fontWeight={600} mb={2} color="rojo.main">
              Criterios de Penalización
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={5} sx={{ py: 1, px:2, bgcolor: 'white', borderLeft: '4px solid #4caf50', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Typography variant="body1" color="">≤ 7 días de baja</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">0%</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={5} sx={{ py: 1, px:2, bgcolor: 'white', borderLeft: '4px solid #ff9800', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Typography variant="body1" color="">8-14 días de baja</Typography>
                  <Typography variant="h6" fontWeight={700} color="warning.main">25%</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={5} sx={{ py: 1, px:2, bgcolor: 'white', borderLeft: '4px solid #ff5722', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Typography variant="body1" color="">15-21 días de baja</Typography>
                  <Typography variant="h6" fontWeight={700} color="error.light">50%</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={5} sx={{ py: 1, px:2, bgcolor: 'white', borderLeft: '4px solid #f44336', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Typography variant="body1" color="">22-28 días de baja</Typography>
                  <Typography variant="h6" fontWeight={700} color="error.main">75%</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={5} sx={{ py: 1, px:2, bgcolor: 'white', borderLeft: '4px solid #d32f2f', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Typography variant="body1" color="">&gt; 28 días de baja</Typography>
                  <Typography variant="h6" fontWeight={700} color="error.dark">100%</Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Cards de empleados */}
        {calculando ? (
        <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress sx={{ color: '#ed2a2aff' }} />
            <Typography variant="h6" ml={2}>Calculando penalizaciones...</Typography>
        </Box>
        ) : !excesoJornada ? (
        <Alert severity="warning">
            No hay datos de exceso de jornada para el año {añoSeleccionado}. 
            Calcula el exceso de jornada primero.
        </Alert>
        ) : empleadosConBajas.length === 0 ? (
        <Alert severity="success" icon={<CheckIcon />}>
            No hay empleados con más de 7 días de baja en {añoSeleccionado}
        </Alert>
        ) : (
        <>
            <Typography variant="h6" textAlign='center' fontWeight={600} mb={1}>
            Empleados con bajas en {añoSeleccionado}
            </Typography>

            <Grid container spacing={2}>
            {empleadosConBajas.map((empleado, index) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={empleado.email}>
                <Card
                    elevation={5}
                    sx={{
                    height: '100%',
                    border: '2px solid',
                    borderColor: empleado.diferencia > 0 ? 'error.main' : 'success.main',
                    position: 'relative',
                    '&:hover': { boxShadow: 6 }
                    }}
                >
                    {/* Badge de posición */}
                    <Box
                    sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        bgcolor: 
                        index === 0 ? 'error.main' : 
                        index === 1 ? 'warning.main' : 
                        index === 2 ? 'info.main' : 'grey.400',
                        color: 'white',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                    }}
                    >
                    #{index + 1}
                    </Box>

                    <CardContent>
                    {/* Nombre del empleado */}
                    <Box mb={2}>
                        <Typography variant="h6" fontWeight={700} color="text.primary">
                        {empleado.nombre}
                        </Typography>
                        <Typography variant="body1" color="">
                        {empleado.puesto}
                        </Typography>
                    </Box>

                    <Divider sx={{ mb: 1 }} />

                    {/* Días de baja */}
                    <Box 
                        sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mb: 0,
                        p: 1.5,
                        bgcolor: 
                            empleado.diasBajaTotales > 28 ? 'error.lighter' :
                            empleado.diasBajaTotales > 21 ? 'warning.lighter' :
                            empleado.diasBajaTotales > 14 ? 'info.lighter' : 'success.lighter',
                        borderRadius: 2
                        }}
                    >
                        <Box display='flex' flexDirection='column' alignItems='center'>
                        <Typography variant="body1" color="">
                            Días de baja
                        </Typography>
                        <Divider sx={{ mb: 0.5, width: '100%', bgcolor:'black' }} />
                        <Typography variant="h4" fontWeight={700} color="error.dark">
                            {empleado.diasBajaTotales}
                        </Typography>
                        </Box>
                        <Box display='flex' flexDirection='column' alignItems='center'>
                        <Typography variant="body1" color="">
                           Penalización
                        </Typography>
                        <Divider sx={{ mb: 0.5, width: '100%', bgcolor:'black' }} />
                        <Typography variant="h4" sx={{
                            
                            fontWeight: 700,
                            height: 40,
                            color: 
                            empleado.porcentaje === 1 ? 'error.dark' :
                            empleado.porcentaje === 0.75 ? 'error.main' :
                            empleado.porcentaje === 0.5 ? 'error.light' :
                            empleado.porcentaje === 0.25 ? 'warning.main' : 'success.main',
                            
                        }}
                        >
                        {`${empleado.porcentaje * 100}%`}
                        </Typography>                        
                        </Box>
                    </Box>

                    {/* Penalización */}
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 6 }}>
                        <Paper sx={{ p: 1, bgcolor: '#fafafa', textAlign: 'center' }}>
                            <Typography variant="body1" color="" display="block">
                            Penalización total
                            </Typography>
                            
                            <Typography fontSize='1.2rem' fontWeight={700} color="error.main">
                            {formatearTiempoVacasLargo(empleado.penalizacionHoras)}
                            </Typography>
                        </Paper>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                        <Paper sx={{ p: 1, bgcolor: '#fafafa', textAlign: 'center' }}>
                            <Typography variant="body1" color="" display="block">
                            Ya aplicada
                            </Typography>
                            
                            <Typography fontSize='1.2rem' fontWeight={600} color="">
                            {formatearTiempoVacasLargo(empleado.penalizacionPreviaHoras)}
                            </Typography>
                        </Paper>
                        </Grid>
                    </Grid>

                    {/* Diferencia y vacaciones */}
                    <Box 
                        sx={{ 
                        p: 2, 
                        bgcolor: empleado.diferencia > 0 ? 'error.lighter' : 'success.lighter',
                        borderRadius: 2,
                        mb: 1,
                        textAlign: 'center'
                        }}
                    >
                        <Typography variant="body1" color="" display="block" mb={0}>
                        {empleado.diferencia > 0 ? 'A restar ahora:' : 'Estado:'}
                        </Typography>
                        {empleado.diferencia > 0 ? (
                        <Typography variant="h5" fontWeight={700} color="error.dark">
                            {formatearTiempoVacasLargo(empleado.diferencia)}
                        </Typography>
                        ) : (
                        <Box display="flex" alignItems="center" gap={1}>
                            <CheckIcon sx={{ color: 'success.main' }} />
                            <Typography variant="h6" fontWeight={700} color="success.dark">
                            Penalización aplicada
                            </Typography>
                        </Box>
                        )}
                    </Box>

                    {/* Vacaciones disponibles */}
                    <Box sx={{ mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body1" color="">
                            Vacaciones actuales:
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                            {formatearTiempoVacasLargo(empleado.vacacionesDisponibles)}
                        </Typography>
                        </Box>
                        
                        {empleado.diferencia > 0 && (
                        <>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1" color="">
                                Después de penalizar:
                            </Typography>
                            <Typography 
                                variant="body1" 
                                fontWeight={700}
                                color={
                                empleado.vacacionesDisponibles - empleado.diferencia < 0 
                                    ? 'error.main' 
                                    : 'success.main'
                                }
                            >
                                {formatearTiempoVacasLargo(empleado.vacacionesDisponibles - empleado.diferencia)}
                            </Typography>
                            </Box>

                            {empleado.vacacionesDisponibles - empleado.diferencia < 0 && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                                ⚠️ Vacaciones negativas. Aplica la penalizacion cuando el empleado haya acumulado más vacaciones.
                            </Alert>
                            )}
                        </>
                        )}
                    </Box>

                    {/* Botón de acción */}
                    <Button
                        fullWidth
                        variant="contained"
                        color={empleado.diferencia > 0 ? 'error' : 'success'}
                        size="large"
                        onClick={() => empleado.diferencia > 0 && handleAbrirDialog(empleado)}
                        disabled={calculando || empleado.diferencia <= 0}
                        startIcon={empleado.diferencia > 0 ? <WarningIcon /> : <CheckIcon />}
                        sx={{
                        py: 1.5,
                        fontWeight: 700,
                        fontSize: '1rem'
                        }}
                    >
                        {empleado.diferencia > 0 ? 'Aplicar penalización' : 'Penalización aplicada'}
                    </Button>
                    </CardContent>
                </Card>
                </Grid>
            ))}
            </Grid>
        </>
        )}
      </Container>

      {/* Dialog de confirmación */}
      <Dialog
        open={dialogOpen}
        onClose={() => !calculando && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{bgcolor:'rojo.main', color:'white', textAlign:'center'}}> 
            Confirmar Penalización
        </DialogTitle>
        <DialogContent>
          {empleadoSeleccionado && (
            <>
              <Alert severity="warning" sx={{ my: 2 }}>
                <Typography variant='body1'>
                Estás a punto de aplicar una penalización a este empleado
                </Typography>
              </Alert>

              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={600}>
                  {(empleadoSeleccionado.nombre)}
                </Typography>
              </Box>

              <Divider sx={{ }} />

              <Grid container spacing={2} textAlign='center'>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{}}>
                    <Typography variant="body1" color="">Penalización a restar:</Typography>
                    <Typography variant="h6" fontWeight={700} color="error.main">
                      {formatearTiempoVacasLargo(empleadoSeleccionado.diferencia)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                 <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontSize='0.9rem' color="">
                    Vacaciones disponibles:
                  </Typography>
                  <Typography fontSize='0.9rem' fontWeight={600}>
                    {formatearTiempoVacasLargo(empleadoSeleccionado.vacacionesDisponibles)}
                  </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontSize='0.9rem' color="">
                     Después: 
                    </Typography>
                    <Typography fontSize='0.9rem' color="success.main" fontWeight={600}>
                     {formatearTiempoVacasLargo(empleadoSeleccionado.vacacionesDisponibles - empleadoSeleccionado.diferencia)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {empleadoSeleccionado.vacacionesDisponibles - empleadoSeleccionado.diferencia < 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  ⚠️ Este empleado quedará con saldo negativo
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={calculando}
            variant="outlined"
            sx={{p:1.5}}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAplicarPenalizacion}
            disabled={calculando}
            variant="contained"
            color="error"
            sx={{p:1.5}}
            startIcon={calculando ? <CircularProgress size={20} color="inherit" /> : <WarningIcon />}
          >
            {calculando ? 'Aplicando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PenalizacionBajas;
