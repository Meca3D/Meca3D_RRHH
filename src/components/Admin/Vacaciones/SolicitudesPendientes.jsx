// components/Admin/Vacaciones/SolicitudesPendientes.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, List, ListItem, ListItemText, Checkbox,
  FormControl, InputLabel, Select, MenuItem, Chip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Grid, CircularProgress, Fab, Collapse, Divider
} from '@mui/material';
import {
  Euro as EuroIcon,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  MarkEmailUnreadOutlined as MarkEmailUnreadOutlinedIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  CancelOutlined as CancelOutlinedIcon,
  SelectAll as SelectAllIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  Schedule as ScheduleIcon,
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';
import { formatearFechaCorta, formatearFechaEspanol2, ordenarFechas,} from '../../../utils/dateUtils';

const SolicitudesPendientes = () => {
  const navigate = useNavigate();
  const { 
    procesarSolicitudesCaducadas,
    solicitudesVacaciones,
    loading,
    loadSolicitudesVacaciones,
    cambiarEstadoSolicitud,
    aprobarSolicitudesMasivamente,
    denegarSolicitudesMasivamente,
    obtenerEmpleadosConSolicitudes,
    obtenerPuestosConSolicitudes
  } = useVacacionesStore();
  const { showSuccess, showError, showInfo } = useUIStore();
  const { obtenerDatosUsuarios} = useAuthStore()

  // Estados principales
  const [solicitudesSeleccionadas, setSolicitudesSeleccionadas] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [datosUsuarios, setDatosUsuarios] = useState({}); 
  const [solicitudesExpanded, setSolicitudesExpanded] = useState({});
  
  // Estados de filtros
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroPuesto, setFiltroPuesto] = useState('Todos');
  const [ordenPor, setOrdenPor] = useState('fechaDisfrute'); // fechaDisfrute, antiguedad

  // Estados de dialogs
  const [dialogAprobar, setDialogAprobar] = useState(false);
  const [dialogDenegar, setDialogDenegar] = useState(false);
  const [solicitudAccion, setSolicitudAccion] = useState(null); // Para acciones individuales
  const [comentariosAdmin, setComentariosAdmin] = useState('');
  const [motivoDenegacion, setMotivoDenegacion] = useState('');
  
  // Estados de loading por acción
  const [procesandoAprobacion, setProcesandoAprobacion] = useState(false);
  const [procesandoDenegacion, setProcesandoDenegacion] = useState(false);

  // Cargar solicitudes al montar
useEffect(() => {
  return loadSolicitudesVacaciones();
}, [loadSolicitudesVacaciones]);

// Procesar caducadas cuando ya hay solicitudes cargadas
useEffect(() => {
  if (solicitudesVacaciones.length > 0) {
    const procesar = async () => {
      try {
        const resultado = await procesarSolicitudesCaducadas();
        if (resultado.procesadas > 0) {
          showInfo(`Se han cancelado automáticamente ${resultado.procesadas} solicitudes caducadas`);
        }
      } catch (error) {
        console.error('Error procesando solicitudes caducadas:', error);
      }
    };
    procesar();
  }
}, [solicitudesVacaciones, procesarSolicitudesCaducadas]);

    useEffect(() => {
    const cargarDatosUsuarios = async () => {
      const emails = [...new Set(solicitudesVacaciones.map(s => s.solicitante))];
      if (emails.length > 0) {
        const usuarios = await obtenerDatosUsuarios(emails);
        setDatosUsuarios(usuarios);
      }
    };
    
    if (solicitudesVacaciones.length > 0) {
      cargarDatosUsuarios();
    }
  }, [solicitudesVacaciones, obtenerDatosUsuarios]);

  // Obtener listas para filtros
  const empleadosDisponibles = useMemo(() => obtenerEmpleadosConSolicitudes(), [solicitudesVacaciones]);
  const puestosDisponibles = useMemo(() => obtenerPuestosConSolicitudes(), []);

  // Filtrar y ordenar solicitudes
  const solicitudesFiltradas = useMemo(() => {
    let solicitudesPendientes = solicitudesVacaciones.filter(s => s.estado === 'pendiente');

    // Aplicar filtros
    if (filtroEmpleado) {
      solicitudesPendientes = solicitudesPendientes.filter(s => s.solicitante === filtroEmpleado);
    }
    
    if (filtroPuesto !== 'Todos') {
        solicitudesPendientes = solicitudesPendientes.filter(s => {
          const userData = datosUsuarios[s.solicitante];
          return userData && userData.puesto === filtroPuesto;
        });
      }

    // Aplicar ordenación
    solicitudesPendientes.sort((a, b) => {
      switch (ordenPor) {
        case 'fechaDisfrute':
        default:
          return new Date(a.fechas[0]) - new Date(b.fechas[0]);
        case 'fechaSolicitud':
          return new Date(a.fechaSolicitud) - new Date(b.fechaSolicitud);
      }
    });

    return solicitudesPendientes;
  }, [solicitudesVacaciones, filtroEmpleado, filtroPuesto, ordenPor]);

  // Handlers de selección
  const handleSeleccionarTodas = () => {
    if (solicitudesSeleccionadas.length === solicitudesFiltradas.length) {
      setSolicitudesSeleccionadas([]);
    } else {
      setSolicitudesSeleccionadas(solicitudesFiltradas.map(s => s.id));
    }
  };

  const handleSeleccionarSolicitud = (solicitudId) => {
    setSolicitudesSeleccionadas(prev => {
      if (prev.includes(solicitudId)) {
        return prev.filter(id => id !== solicitudId);
      } else {
        return [...prev, solicitudId];
      }
    });
  };

  // Handlers de acciones individuales
  const handleAprobarIndividual = (solicitud) => {
    setSolicitudAccion(solicitud);
    setComentariosAdmin('');
    setDialogAprobar(true);
  };

  const handleDenegarIndividual = (solicitud) => {
    setSolicitudAccion(solicitud);
    setMotivoDenegacion('');
    setDialogDenegar(true);
  };

  const handleConfirmarAprobacion = async () => {
    const esIndividual = Boolean(solicitudAccion);
    
    try {
      setProcesandoAprobacion(true);
      
      if (esIndividual) {
        // Aprobación individual
        await cambiarEstadoSolicitud(solicitudAccion.id, 'aprobada', comentariosAdmin, solicitudAccion);
        showSuccess('Solicitud aprobada correctamente');
      } else {
        // Aprobación masiva
        const resultado = await aprobarSolicitudesMasivamente(solicitudesSeleccionadas, comentariosAdmin);
        
        if (resultado.exito) {
          showSuccess(`${resultado.procesadas} solicitudes aprobadas correctamente`);
        } else {
          showError(`${resultado.procesadas} aprobadas, ${resultado.errores.length} errores`);
        }
        setSolicitudesSeleccionadas([]);
      }
      
      setDialogAprobar(false);
      setSolicitudAccion(null);
      setComentariosAdmin('');
    } catch (error) {
      showError(error.message);
    } finally {
      setProcesandoAprobacion(false);
    }
  };

  const handleConfirmarDenegacion = async () => {
    if (!motivoDenegacion.trim()) {
      showError('Debes escribir un motivo para la denegación');
      return;
    }

    const esIndividual = Boolean(solicitudAccion);
    
    try {
      setProcesandoDenegacion(true);
      
      if (esIndividual) {
        // Denegación individual
        await cambiarEstadoSolicitud(solicitudAccion.id, 'denegada', motivoDenegacion, solicitudAccion);
        showSuccess('Solicitud denegada correctamente');
      } else {
        // Denegación masiva
        const resultado = await denegarSolicitudesMasivamente(solicitudesSeleccionadas, motivoDenegacion);
        
        if (resultado.exito) {
          showSuccess(`${resultado.procesadas} solicitudes denegadas correctamente`);
        } else {
          showError(`${resultado.procesadas} denegadas, ${resultado.errores.length} errores`);
        }
        setSolicitudesSeleccionadas([]);
      }
      
      setDialogDenegar(false);
      setSolicitudAccion(null);
      setMotivoDenegacion('');
    } catch (error) {
      showError(error.message);
    } finally {
      setProcesandoDenegacion(false);
    }
  };
    const handleToggleExpanded = (solicitudId) => {
        setSolicitudesExpanded(prev => ({
        ...prev,
        [solicitudId]: !prev[solicitudId]
        }));
    };

  // Calcular días hasta fecha límite
  const getDiasHastaFecha = (fecha) => {
    const hoy = new Date();
    const fechaDisfrute = new Date(fecha);
    const diffTime = fechaDisfrute - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const getTextoUrgencia = (diasHasta) => {
    if (diasHasta < 0) return 'Fecha pasada';
    if (diasHasta === 0) return 'Comienza hoy';
    if (diasHasta === 1) return 'Comienza mañana';
    return `Comienza en ${diasHasta} días`;
  };

  // Obtener color de urgencia
  const getColorUrgencia = (diasHasta) => {
    if (diasHasta < 0) return 'error'; // Ya pasó
    if (diasHasta <= 3) return 'error'; // Muy urgente
    if (diasHasta <= 7) return 'warning'; // Urgente
    return 'success'; // Normal
  };

  return (
    <>
    <AppBar
    sx={{ 
              overflow:'hidden',
              background: 'linear-gradient(135deg, #FB8C00 0%, #F57C00 50%, #EF6C00 100%)',
              boxShadow: '0 2px 10px rgba(251, 140, 0, 0.2)',
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
                  Solicitudes Pendientes
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    opacity: 0.9,
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}
                >
                  Revisa y gestiona las peticiones
                </Typography>
              </Box>
              {/* Icono decorativo */}
              <IconButton
                edge="end"
                color="inherit"
                sx={{
                  cursor: 'default'
                }}
              >
                <MarkEmailUnreadOutlinedIcon sx={{fontSize:'2rem'}}/>
              </IconButton>
    
            </Toolbar>
          </AppBar>


      <Container maxWidth="md" sx={{ pb: 3 }}>
        {/* Controles y filtros */}
        <Card sx={{ mt:1, mb: 3 }}>
          <CardContent sx={{ p: 2,mt:0.5}}>
            {/* Controles principales */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', }}>
              <Box sx={{ flexGrow: 1, mr: 1,  }}> 
              <Button
                variant="outlined"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                sx={{
                  height:'3rem',
                  borderColor: 'warning.main',
                  color: 'warning.main',
                  '&:hover': { bgcolor: 'warning.50', borderColor: 'warning.main' }
                }}
              >
                Filtros {mostrarFiltros ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Button>
              </Box>
              <Box sx={{ flexGrow: 1, ml: 1 }}> 
              <Button
                variant="outlined"
                onClick={handleSeleccionarTodas}
                disabled={solicitudesFiltradas.length === 0}
                sx={{   
                  height:'3rem',           
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main' }
                }}
              >
                {solicitudesSeleccionadas.length === solicitudesFiltradas.length ? 'Deseleccionar' : 'Seleccionar'} todas
              </Button>
              </Box>
            </Box>

            {/* Acciones masivas */}
            {solicitudesSeleccionadas.length > 0 && (
              <Box sx={{bgcolor:'azul.fondo', borderRadius:2, p:1.5, mt:2 }}>
                <Box sx={{display:'flex', justifyContent:'center'}}>
                  <InfoOutlinedIcon sx={{color:'azul.main'}}/>
                  <Typography variant="body1" gutterBottom>
                    {solicitudesSeleccionadas.length} solicitud{solicitudesSeleccionadas.length > 1 ? 'es' : ''} seleccionada{solicitudesSeleccionadas.length > 1 ? 's' : ''}
                  </Typography>
                  </Box>
                    <Box sx={{ mt:1, display: 'flex', justifyContent: 'space-between', }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<CancelOutlinedIcon />}
                      sx={{py:1}}
                      onClick={() => {
                        setSolicitudAccion(null);
                        setMotivoDenegacion('');
                        setDialogDenegar(true);
                      }}
                    >
                      Denegar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CheckCircleOutlineIcon />}
                      onClick={() => {
                        setSolicitudAccion(null);
                        setComentariosAdmin('');
                        setDialogAprobar(true);
                      }}
                    >
                      Aprobar
                    </Button>
                </Box>
              </Box>
            )}

            {/* Panel de filtros */}
            <Collapse in={mostrarFiltros}>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs:12, sm:4}}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Empleado</InputLabel>
                    <Select
                      value={filtroEmpleado}
                      label="Empleado"
                      onChange={(e) => setFiltroEmpleado(e.target.value)}
                    >
                      <MenuItem value="">Todos los empleados</MenuItem>
                      {empleadosDisponibles.map(empleado => (
                        <MenuItem key={empleado} value={empleado}>
                          {empleado}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs:12, sm:4}}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Puesto</InputLabel>
                    <Select
                      value={filtroPuesto}
                      label="Puesto"
                      onChange={(e) => setFiltroPuesto(e.target.value)}
                    >
                      {puestosDisponibles.map(puesto => (
                        <MenuItem key={puesto} value={puesto}>
                          {puesto}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs:12, sm:4}}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Ordenar por</InputLabel>
                    <Select
                      value={ordenPor}
                      label="Ordenar por"
                      onChange={(e) => setOrdenPor(e.target.value)}
                    >
                      <MenuItem value="fechaDisfrute">Fecha de disfrute</MenuItem>
                      <MenuItem value="fechaSolicitud">Fecha de Solicitud</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </Card>

        {/* Lista de solicitudes */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Cargando solicitudes...
            </Typography>
          </Box>
        ) : solicitudesFiltradas.length === 0 ? (
          <Alert severity="info">
            No hay solicitudes pendientes con los filtros aplicados.
          </Alert>
        ) : (
          <List>
            {solicitudesFiltradas.map((solicitud) => {
              const diasHasta = getDiasHastaFecha(solicitud.fechas[0]);
              const colorUrgencia = getColorUrgencia(diasHasta);
              const textoUrgencia = getTextoUrgencia(diasHasta);
              const esSeleccionada = solicitudesSeleccionadas.includes(solicitud.id);
              const userData = datosUsuarios[solicitud.solicitante] || {};
              const esExpandida = solicitudesExpanded[solicitud.id];

              return (
                <Card
                  key={solicitud.id}
                  sx={{
                    mb: 2,
                    border: esSeleccionada ? '2px solid' : '1px solid',
                    borderColor: esSeleccionada ? 'primary.main' : 'divider',
                    bgcolor: esSeleccionada ? 'primary.50' : 'background.paper'
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Checkbox
                        checked={esSeleccionada}
                        onChange={() => handleSeleccionarSolicitud(solicitud.id)}
                        sx={{ mt: -1,ml:-1 }}
                      />
                      <Chip
                        icon={solicitud.esVenta?<EuroIcon />:<ScheduleIcon />}
                        label={solicitud.esVenta?'Venta de Vacaciones':textoUrgencia}
                        color={solicitud.esVenta?'success':colorUrgencia}
                        size="small"
                        />
                    </Box>
     
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center',mt:2, mb: 1 }}>
                        <Typography variant="h6" fontWeight={600}>
                        {userData.nombre || solicitud.solicitante}
                        </Typography>
                        {userData.puesto && (
                        <Typography variant="subtitle1" color="">
                        {userData.puesto}
                        </Typography>
                        )}
                    </Box>
                          
                        {/* Detalles de la solicitud */}
                        <Box sx={{ mb: 2, textAlign:"center" }}>
                          <Typography variant="body1"  gutterBottom>
                           Solicitado: {formatearFechaCorta(solicitud.fechaSolicitud)}
                          </Typography>
                          {solicitud.esVenta && (
                            <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', color:'success.dark',}}>
                                  <EuroIcon sx={{fontSize:'1.4rem'}}/>
                                  <Typography sx={{fontSize:'1.3rem', ml:1, fontWeight:'bold'}}>
                                    Venta de Vacaciones
                                  </Typography>
                                  <EuroIcon sx={{fontSize:'1.4rem', ml:1}}/>
                                </Box>
                          ) }
                          <Typography variant="h5" fontWeight={600} gutterBottom>
                           {formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                          </Typography>
                          {!solicitud.esVenta && (
                          solicitud.fechas.length === 1 
                                ? (
                                <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', color:'azul.main',}}>
                                  <CalendarTodayIcon sx={{fontSize:'1.4rem'}}/>
                                  <Typography sx={{fontSize:'1.2rem', ml:1}}>
                                    {formatearFechaEspanol2(solicitud.fechas[0])}
                                  </Typography>
                                </Box>
                                ):(

                          <Box sx={{ mb: 1 }}>
                            <Button
                              variant="text"
                              
                              endIcon={esExpandida ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              onClick={() => handleToggleExpanded(solicitud.id)}
                              sx={{ p: 0.5, minWidth: 'auto', textTransform: 'none' }}
                            >< CalendarTodayIcon sx={{fontSize:'1.4rem'}}/>
                              <Typography sx={{fontSize:'1.35rem', ml:1}}>
                                 días seleccionados 
                              </Typography>  
                            </Button>
                            
                            {/* ✅ NUEVO: Lista colapsable de fechas */}
                            <Collapse in={esExpandida}>
                              <Box sx={{ mt: 1, p: 1, bgcolor: 'azul.fondo', borderRadius: 1 }}>
                                <Box   sx={{}}>
                                {ordenarFechas(solicitud.fechas).map((fecha, index) => (
                                  <Typography key={index} variant="body1" textAlign="center" sx={{fontSize:'1.3rem'}} >
                                    • {formatearFechaCorta(fecha)}
                                  </Typography>
                                ))}
                                </Box>
                              </Box>
                            </Collapse>
                          </Box>
                                )
                              )}
                          {solicitud.comentariosSolicitante && (
                            <Typography variant="body1" sx={{ fontSize:'1.25rem', fontStyle: 'italic', mt:1 }}>
                              "{solicitud.comentariosSolicitante}"
                            </Typography>
                          )}
                        </Box>

                        {/* Botones de acción - sin cambios */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            sx={{textTransform: 'none', px:2.5, py:1.5}}
                            startIcon={<CancelOutlinedIcon />}
                            onClick={() => handleDenegarIndividual(solicitud)}
                          >
                            <Typography fontSize={'1.1rem'}>
                            Denegar
                            </Typography>
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            sx={{textTransform: 'none', px:2.5, py:1.5}}
                            startIcon={<CheckCircleOutlineIcon />}
                            onClick={() => handleAprobarIndividual(solicitud)}
                          >
                            <Typography fontSize={'1.1rem'}>
                            Aprobar
                            </Typography>
                          </Button>
                        </Box>
                  </CardContent>
                </Card>
              );
            })}
          </List>
        )}
      </Container>

      <Dialog
        open={dialogAprobar}
        onClose={() => !procesandoAprobacion && setDialogAprobar(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{bgcolor:'success.main', color:'white', textAlign:'center'}}>
          {solicitudAccion ? 'Aprobar Solicitud' : `Aprobar ${solicitudesSeleccionadas.length} Solicitudes`}
        </DialogTitle>
        <DialogContent>
          {solicitudAccion ? (
            <Alert severity="success" sx={{ my: 2 }}>
              <Typography variant="body1" sx={{ fontSize: '1.1rem', textAlign: 'center' }}>
                <strong>{datosUsuarios[solicitudAccion.solicitante]?.nombre || solicitudAccion.solicitante}</strong>
                <br />
                {solicitudAccion.esVenta===true && 'Vender '}{formatearTiempoVacasLargo(solicitudAccion.horasSolicitadas)} 
              </Typography>
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Se aprobarán <strong>{solicitudesSeleccionadas.length}</strong> solicitudes seleccionadas.
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comentarios (opcional)"
            value={comentariosAdmin}
            onChange={(e) => setComentariosAdmin(e.target.value)}
            placeholder="Mensaje para el empleado..."
            disabled={procesandoAprobacion}
          />
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between', p:3, mb:-1}}>
          <Button 
            sx={{py:1, textTransform:'none', fontSize:'1.1rem'}}
            variant='outlined'
            color='error'
            onClick={() => setDialogAprobar(false)}
            disabled={procesandoAprobacion}
          >
            Volver
          </Button>
          <Button 
            onClick={handleConfirmarAprobacion}
            variant="contained"
            color="success"
            sx={{py:1, textTransform:'none',fontSize:'1.1rem'}}
            disabled={procesandoAprobacion}
            startIcon={procesandoAprobacion ? <CircularProgress size={16} /> : <CheckCircleOutlineIcon />}
          >
            {procesandoAprobacion ? 'Aprobando...' : 'Aprobar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogDenegar}
        onClose={() => !procesandoDenegacion && setDialogDenegar(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{bgcolor:'rojo.main', color:'white', textAlign:'center'}}>
          {solicitudAccion ? 'Denegar Solicitud' : `Denegar ${solicitudesSeleccionadas.length} Solicitudes`}
        </DialogTitle>
        <DialogContent>
          {solicitudAccion ? (
            <Box sx={{ bgcolor: 'rojo.fondo', my: 2, alignItems: 'center', flexGrow:1 }}>
              <Typography variant="h6" sx={{ fontSize: '1.25rem', textAlign: 'center' }}>
                <strong>{datosUsuarios[solicitudAccion.solicitante]?.nombre || solicitudAccion.solicitante}</strong>
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '1.05rem', textAlign: 'center' }}>
                {formatearTiempoVacasLargo(solicitudAccion.horasSolicitadas)} solicitados
              </Typography>
            </Box>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Se denegarán las <strong>{solicitudesSeleccionadas.length}</strong> solicitudes seleccionadas.
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo de la denegación *"
            value={motivoDenegacion}
            onChange={(e) => setMotivoDenegacion(e.target.value)}
            placeholder="Explica por qué se deniega la solicitud..."
            disabled={procesandoDenegacion}
            required
            helperText="Es obligatorio especificar un motivo"
          />
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between', p:3, mb:-1}}>
          <Button
            variant='outlined'
            onClick={() => setDialogDenegar(false)}
            disabled={procesandoDenegacion}
            sx={{py:1}}
          >
            Volver
          </Button>
          <Button 
            onClick={handleConfirmarDenegacion}
            variant="contained"
            color="error"
            sx={{py:1}}
            disabled={procesandoDenegacion || !motivoDenegacion.trim()}
            startIcon={procesandoDenegacion ? <CircularProgress size={16} /> : <CancelOutlinedIcon />}
          >
            {procesandoDenegacion ? 'Denegando...' : 'Denegar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SolicitudesPendientes;