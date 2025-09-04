import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Grid, Chip, List, ListItem, ListItemText, 
  ListItemIcon, Divider, Alert, LinearProgress, Stack,
  FormControl, InputLabel, Select, MenuItem, Collapse // ✅ Añadidos
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // ✅ Nuevo
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; // ✅ Nuevo
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // ✅ Nuevo
import { es } from 'date-fns/locale'; // ✅ Nuevo para español
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  BeachAccessOutlined as BeachIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  CalendarMonth as CalendarIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import { formatearTiempoVacas, formatearTiempoVacasLargo } from '../../utils/vacacionesUtils';
import { formatearFechaCorta, esFechaPasadaOHoy } from '../../utils/dateUtils';

const MiSaldoVacaciones = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { solicitudesVacaciones, loadMisSolicitudesVacaciones } = useVacacionesStore();

  // Estados para filtros
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('año');
  const [fechaPersonalizada, setFechaPersonalizada] = useState(null);

  const vacacionesDisponibles = userProfile?.vacaciones?.disponibles || 0;
  const vacacionesPendientes = userProfile?.vacaciones?.pendientes || 0;

  useEffect(() => {
    const unsubscribe = loadMisSolicitudesVacaciones(user?.email);
    return () => unsubscribe && unsubscribe();
  }, [user?.email, loadMisSolicitudesVacaciones]);

  // ✅ NUEVO: Calcular solicitudes aprobadas futuras
  const solicitudesAprobadasFuturas = useMemo(() => {
    return solicitudesVacaciones.filter(s => 
      s.estado === 'aprobada' && !esFechaPasadaOHoy(s.fechas[0])
    );
  }, [solicitudesVacaciones]);

  // ✅ NUEVO: Calcular horas comprometidas totales
  const horasComprometidasFuturas = solicitudesAprobadasFuturas.reduce(
    (total, s) => total + s.horasSolicitadas, 0
  );
  
  const horasTotalComprometidas = vacacionesPendientes + horasComprometidasFuturas;
  const horasRealmenteLibres = vacacionesDisponibles - horasTotalComprometidas;
  
  const porcentajeComprometido = vacacionesDisponibles > 0 
    ? Math.round((horasTotalComprometidas / vacacionesDisponibles) * 100) 
    : 0;

  const solicitudesAprobadas = useMemo(() => {
    const ahora = new Date();
    
    let fechaLimite;
    switch (periodoSeleccionado) {
      case '3m':
        fechaLimite = new Date();
        fechaLimite.setMonth(fechaLimite.getMonth() - 3);
        break;
      case '6m':
        fechaLimite = new Date();
        fechaLimite.setMonth(fechaLimite.getMonth() - 6);
        break;
      case 'personalizado':
        fechaLimite = fechaPersonalizada || new Date(ahora.getFullYear(), 0, 1);
        break;
      case 'año':
      default:
        fechaLimite = new Date(ahora.getFullYear(), 0, 1);
        break;
    }

    return solicitudesVacaciones
      .filter(s => s.estado === 'aprobada' && new Date(s.fechaSolicitudOriginal || s.fechaSolicitud) >= fechaLimite)
      .sort((a, b) => new Date(a.fechaSolicitudOriginal || a.fechaSolicitud) - new Date(b.fechaSolicitudOriginal || b.fechaSolicitud));
  }, [solicitudesVacaciones, periodoSeleccionado, fechaPersonalizada]);

    const handlePeriodoChange = (event) => {
      const nuevoPeriodo = event.target.value;
      setPeriodoSeleccionado(nuevoPeriodo);
      
      // Si no es personalizado, limpiar fecha personalizada
      if (nuevoPeriodo !== 'personalizado') {
        setFechaPersonalizada(null);
      }
    };

    // ✅ NUEVO: Handler para fecha personalizada
    const handleFechaPersonalizadaChange = (nuevaFecha) => {
      setFechaPersonalizada(nuevaFecha);
    };
  // ✅ NUEVO: Calcular evolución del saldo
  const evolucionSaldo = useMemo(() => {
    const inicioAño = new Date(new Date().getFullYear(), 0, 1);
    
    // Calcular saldo inicial del período (asumiendo que tenías las mismas horas al inicio)
    const horasUsadasEnPeriodo = solicitudesAprobadas.reduce((total, s) => total + s.horasSolicitadas, 0);
    const saldoInicial = vacacionesDisponibles + horasUsadasEnPeriodo;
    
    let saldoActual = saldoInicial;
    const evoluciones = [{
      fecha: inicioAño,
      concepto: 'Saldo inicial del período',
      horasSolicitadas: 0,
      saldoAntes: saldoInicial,
      saldoDespues: saldoInicial,
      tipo: 'inicial'
    }];

    solicitudesAprobadas.forEach(solicitud => {
      const saldoAntes = saldoActual;
      saldoActual -= solicitud.horasSolicitadas;
      
      evoluciones.push({
        fecha: new Date(solicitud.fechaSolicitudOriginal || solicitud.fechaSolicitud),
        concepto: solicitud.fechas.length === 1 ? `${solicitud.fechas}` : `${solicitud.fechas.length} días`,
        horasSolicitadas: solicitud.horasSolicitadas,
        saldoAntes,
        saldoDespues: saldoActual,
        tipo: 'solicitud',
        esFuturo: !esFechaPasadaOHoy(solicitud.fechas[0])
      });
    });

    return evoluciones;
  }, [solicitudesAprobadas, vacacionesDisponibles]);

  // ✅ NUEVO: Próximas vacaciones planificadas
  const proximasVacaciones = solicitudesAprobadasFuturas
    .sort((a, b) => new Date(a.fechas) - new Date(b.fechas))
    .slice(0, 3);

    
    const periodos = [
      { value: '3m', label: 'Últimos 3 meses' },
      { value: '6m', label: 'Últimos 6 meses' },
      { value: 'año', label: 'Año actual' },
      { value: 'personalizado', label: 'Período personalizado' }
    ];

  return (
    <>
<AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
          boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/vacaciones')}
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
              Mi saldo
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Estado actual de tus vacaciones
            </Typography>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
            <BeachIcon sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ pb: 4 }}>
        {/* ✅ NUEVO: Resumen principal mejorado */}
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #E8F5E8 0%, #F1F8E9 100%)' }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid xs={12} sm={5}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight={700} color="success.main" gutterBottom>
                    {formatearTiempoVacas(horasRealmenteLibres)}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Realmente disponibles
                  </Typography>
                </Box>
              </Grid>

              <Grid xs={12} sm={7}>
                <Typography variant="h6" gutterBottom>Estado de tu saldo {new Date().getFullYear()}</Typography>
                
                {/* ✅ NUEVO: Barra de progreso mejorada */}
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={porcentajeComprometido}
                    sx={{
                      height: 12,
                      borderRadius: 6,
                      bgcolor: 'success.100',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: porcentajeComprometido > 80 ? 'error.main' : 
                                porcentajeComprometido > 60 ? 'warning.main' : 'success.main'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {porcentajeComprometido}% comprometido (usado + planificado + pendiente)
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid xs={4}>
                    <Typography variant="body2" color="text.secondary">Total anual</Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {formatearTiempoVacas(vacacionesDisponibles)}
                    </Typography>
                  </Grid>
                  <Grid xs={4}>
                    <Typography variant="body2" color="text.secondary">Pendientes</Typography>
                    <Typography variant="h6" fontWeight={600} color="warning.main">
                      {formatearTiempoVacas(vacacionesPendientes)}
                    </Typography>
                  </Grid>
                  <Grid xs={4}>
                    <Typography variant="body2" color="text.secondary">Planificadas</Typography>
                    <Typography variant="h6" fontWeight={600} color="info.main">
                      {formatearTiempoVacas(horasComprometidasFuturas)}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* ✅ NUEVO: Próximas vacaciones */}
            {proximasVacaciones.length > 0 && (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  📅 Próximas vacaciones planificadas:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {proximasVacaciones.map((solicitud, index) => (
                    <Chip 
                      key={index}
                      label={`${formatearTiempoVacas(solicitud.horasSolicitadas)} - ${solicitud.fechas}`}
                      size="small"
                      color="info"
                    />
                  ))}
                </Stack>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection:'column', justifyContent: 'center', mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon />
                Evolución del saldo
              </Typography>
              
              {/* ✅ NUEVO: Select en lugar de ButtonGroup */}
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Período a visualizar</InputLabel>
                <Select
                  value={periodoSeleccionado}
                  label="Período a visualizar"
                  onChange={handlePeriodoChange}
                >
                  {periodos.map(periodo => (
                    <MenuItem key={periodo.value} value={periodo.value}>
                      {periodo.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* ✅ NUEVO: DatePicker condicional */}
            <Collapse in={periodoSeleccionado === 'personalizado'}>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                  <DatePicker
                    label="Desde qué fecha"
                    value={fechaPersonalizada}
                    onChange={handleFechaPersonalizadaChange}
                    maxDate={new Date()}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        helperText: 'Selecciona desde qué fecha quieres ver el historial'
                      }
                    }}
                  />
                </LocalizationProvider>
                
                {fechaPersonalizada && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Mostrando historial desde {fechaPersonalizada.toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Typography>
                )}
              </Box>
            </Collapse>
            
            {evolucionSaldo.length <= 1 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No hay movimientos registrados en este período
              </Typography>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {evolucionSaldo.map((item, index) => (
                  <Box key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {item.tipo === 'inicial' ? (
                          <CalendarIcon color="action" />
                        ) : (
                          <TrendingDownIcon color={item.esFuturo ? 'info' : 'success'} />
                        )}
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" fontWeight={500}>
                              {item.concepto}
                            </Typography>
                            {item.tipo === 'solicitud' && (
                              <Chip
                                label={formatearTiempoVacas(item.horasSolicitadas)}
                                size="small"
                                color={item.esFuturo ? 'info' : 'success'}
                              />
                            )}
                            {item.esFuturo && (
                              <Chip label="Planificada" size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {formatearFechaCorta(item.fecha)}
                            </Typography>
                            {item.tipo === 'solicitud' && (
                              <Typography variant="caption" color="text.secondary">
                                Saldo: {formatearTiempoVacas(item.saldoAntes)} → {formatearTiempoVacas(item.saldoDespues)}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    
                    {index < evolucionSaldo.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default MiSaldoVacaciones;
