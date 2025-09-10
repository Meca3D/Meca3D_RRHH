// components/Admin/Vacaciones/HistorialSolicitudes.jsx - VERSIÓN CORREGIDA
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, FormControl, InputLabel, Select, 
  MenuItem, Chip, Alert, Grid, Collapse, Divider, Avatar, Paper,
  CircularProgress, Pagination, InputAdornment, Dialog, DialogTitle, 
  DialogContent, DialogActions,
} from '@mui/material';
import {
  ArrowBackIosNew,
  History,
  Search,
  FilterList,
  GetApp,
  ExpandMore,
  ExpandLess,
  Person,
  CalendarToday,
  AccessTime,
  CheckCircleOutline,
  CancelOutlined,
  PendingActions,
  ErrorOutline,
  AccountCircleOutlined,
  LocalPoliceOutlined,
  Clear
} from '@mui/icons-material';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useUIStore } from '../../../stores/uiStore';
import SelectorDiasCancelacion from './SelectorDiasCancelacion';
import { esFechaPasadaOHoy, formatearFechaCorta, } from '../../../utils/dateUtils';
import { formatearNombre } from '../../Helpers';
import { formatearTiempoVacas, formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';

const HistorialSolicitudes = () => {
  const navigate = useNavigate();
  const {
    loadHistorialSolicitudes,
    exportarHistorialCSV,
    obtenerDatosUsuarios,
    cancelarSolicitudParcial
  } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [solicitudes, setSolicitudes] = useState([]);
  const [datosUsuarios, setDatosUsuarios] = useState({});
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [fechasExpanded, setFechasExpanded] = useState({});
  const [dialogCancelarParcial, setDialogCancelarParcial] = useState(false);
  const [solicitudParaCancelar, setSolicitudParaCancelar] = useState(null);
  const [diasACancelar, setDiasACancelar] = useState([]);
  const [motivoCancelacionParcial, setMotivoCancelacionParcial] = useState('');
  const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);
  const [estadisticaActivaFiltro, setEstadisticaActivaFiltro] = useState(''); // Para saber qué estadística está filtrando

  // Estados de filtros
  const [filtros, setFiltros] = useState({
    estado: 'todos',
    empleado: '',
    año: new Date().getFullYear(),
    busqueda: ''
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estados de paginación y expansión
  const [paginaActual, setPaginaActual] = useState(1);
  const [solicitudesExpanded, setSolicitudesExpanded] = useState({});
  const solicitudesPorPagina = 10;

  // Cargar historial inicial
    useEffect(() => {
    const cargarHistorial = async () => {
        setLoading(true);
        try {
        const filtrosSinBusqueda = { ...filtros };
        delete filtrosSinBusqueda.busqueda; // Quitar búsqueda de filtros de store
        
        const historial = await loadHistorialSolicitudes(filtrosSinBusqueda);

        const emails = [...new Set(historial.map(s => s.solicitante))];
        if (emails.length > 0) {
            const usuarios = await obtenerDatosUsuarios(emails);
            setDatosUsuarios(usuarios);
            
            // ✅ APLICAR filtro de búsqueda AQUÍ donde tenemos datosUsuarios
            let historialFiltrado = historial;
            if (filtros.busqueda) {
            const termino = filtros.busqueda.toLowerCase();
            historialFiltrado = historial.filter(s => {
                const userData = usuarios[s.solicitante] || {};
                const nombre = (userData.nombre || s.solicitante).toLowerCase();
                const comentarios = (s.comentariosSolicitante || '').toLowerCase();
                const comentariosAdmin = (s.comentariosAdmin || '').toLowerCase();
                const motivoCancelacion = (s.motivoCancelacion || '').toLowerCase();
                
                return nombre.includes(termino) || 
                    s.solicitante.toLowerCase().includes(termino) ||
                    comentarios.includes(termino) || 
                    comentariosAdmin.includes(termino) ||
                    motivoCancelacion.includes(termino);
            });
            }
            
            setSolicitudes(historialFiltrado);
        } else {
            setSolicitudes(historial);
        }
        } catch (error) {
        showError('Error cargando el historial de solicitudes: ' + error.message);
        } finally {
        setLoading(false);
        }
    };

    cargarHistorial();
    }, [filtros, loadHistorialSolicitudes, obtenerDatosUsuarios]);


  // Empleados disponibles para filtro
  const empleadosDisponibles = useMemo(() => {
    return [...new Set(solicitudes.map(s => s.solicitante))].sort();
  }, [solicitudes]);

  // ✅ Estadísticas TOTALES (fijas, no cambian con filtros)
  const estadisticasTotales = useMemo(() => {
    const stats = {
      total: solicitudes.length,
      aprobadas: 0,
      denegadas: 0,
      canceladas: 0,
      pendientes: 0,
      diasTotales: 0,
      empleadosUnicos: new Set(),
      promedioHorasPorSolicitud: 0
    };
    
    let horasTotales = 0;
    
    solicitudes.forEach(s => {
      if (s.estado === 'aprobada') stats.aprobadas++;
      else if (s.estado === 'denegada') stats.denegadas++;
      else if (s.estado === 'cancelado') stats.canceladas++;
      else if (s.estado === 'pendiente') stats.pendientes++;
      
      stats.empleadosUnicos.add(s.solicitante);
      
      if (s.horasSolicitadas) {
        horasTotales += s.horasSolicitadas;
        if (s.estado === 'aprobada') {
          stats.diasTotales += Math.round(s.horasSolicitadas / 8);
        }
      }
    });
    
    stats.promedioHorasPorSolicitud = stats.total > 0 ? Math.round(horasTotales / stats.total) : 0;
    stats.empleadosUnicos = stats.empleadosUnicos.size;
    
    return stats;
  }, [solicitudes]);

  // ✅ Solicitudes filtradas para la lista
  const solicitudesFiltradas = useMemo(() => {
    let filtradas = solicitudes;

    // Filtro por estadística clickeada
    if (estadisticaActivaFiltro) {
      if (estadisticaActivaFiltro !== 'total') {
        filtradas = filtradas.filter(s => s.estado === estadisticaActivaFiltro);
      }
    }

    return filtradas;
  }, [solicitudes, estadisticaActivaFiltro]);


  // Paginación
  const solicitudesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * solicitudesPorPagina;
    const fin = inicio + solicitudesPorPagina;
    return solicitudesFiltradas.slice(inicio, fin);
  }, [solicitudesFiltradas, paginaActual]);

  const totalPaginas = Math.ceil(solicitudesFiltradas.length / solicitudesPorPagina);

  // Handlers
  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
    setPaginaActual(1); // Reset página al filtrar
  };

    const handleClickEstadistica = (tipoEstadistica) => {
    if (estadisticaActivaFiltro === tipoEstadistica) {
      setEstadisticaActivaFiltro('');
    } else {
      setEstadisticaActivaFiltro(tipoEstadistica);
      setFiltros(prev => ({ ...prev, estado: 'todos' }));
    }
  };


  const handleToggleExpanded = (solicitudId) => {
    setSolicitudesExpanded(prev => ({
      ...prev,
      [solicitudId]: !prev[solicitudId]
    }));
  };

  const handleExportarCSV = async () => {
    setExportando(true);
    try {
      await exportarHistorialCSV(solicitudes, datosUsuarios);
      showSuccess('Historial exportado correctamente');
    } catch (error) {
      showError('Error exportando el historial: ' + error.message);
    } finally {
      setExportando(false);
    }
  };

  // Generar opciones de años
  const añosDisponibles = useMemo(() => {
    const años = new Set();
    const añoActual = new Date().getFullYear();
    
    // Añadir año actual y anteriores
    for (let i = añoActual; i >= añoActual - 5; i--) {
      años.add(i);
    }
    
    // Añadir años de las solicitudes existentes
    solicitudes.forEach(s => {
      const añoSolicitud = new Date(s.fechaSolicitud).getFullYear();
      años.add(añoSolicitud);
    });
    
    return [...años].sort((a, b) => b - a);
  }, [solicitudes]);

  // Obtener icono por estado
  const getIconoEstado = (estado) => {
    switch (estado) {
      case 'aprobada': return <CheckCircleOutline color="success" />;
      case 'denegada': return <CancelOutlined color="error" />;
      case 'cancelado': return <ErrorOutline color="warning" />;
      case 'pendiente': return <PendingActions color="info" />;
      default: return <PendingActions />;
    }
  };

  // Obtener color por estado
  const getColorEstado = (estado) => {
    switch (estado) {
      case 'aprobada': return 'success';
      case 'denegada': return 'error';
      case 'cancelado': return 'warning';
      case 'pendiente': return 'info';
      default: return 'default';
    }
  };

  const getEstadoTexto = (estado) => {
  switch (estado) {
    case 'aprobada': return 'Aprobada';
    case 'denegada': return 'Denegada'; 
    case 'cancelado': return 'Cancelada';
    default: return 'Pendiente';
  }
};

    const handleAbrirCancelacionParcial = (solicitud) => {
    setSolicitudParaCancelar(solicitud);
    setDiasACancelar([]);
    setMotivoCancelacionParcial('');
    setDialogCancelarParcial(true);
    };

    const handleConfirmarCancelacionParcial = async () => {
    if (diasACancelar.length === 0) {
        showError('Debes seleccionar al menos un día para cancelar');
        return;
    }

    if (!motivoCancelacionParcial.trim()) {
        showError('Debes especificar un motivo para la cancelación parcial');
        return;
    }

    if (diasACancelar.length >= solicitudParaCancelar.fechas.length) {
        showError('No puedes cancelar todos los días. Para eso usa cancelación completa');
        return;
    }

    try {
        setProcesandoCancelacion(true);
        
        const resultado = await cancelarSolicitudParcial(
        solicitudParaCancelar,
        diasACancelar,
        motivoCancelacionParcial
        );

        showSuccess(
        `Cancelación parcial procesada correctamente. (${resultado.diasCancelados} días)`
        );
        
        setDialogCancelarParcial(false);
        setSolicitudParaCancelar(null);
        setDiasACancelar([]);
        setMotivoCancelacionParcial('');
        setFiltros({
          estado: 'todos',
          empleado: '',
          año: new Date().getFullYear(),
          busqueda: ''
        });
        
    } catch (error) {
        showError(`Error en cancelación parcial: ${error.message}`);
    } finally {
        setProcesandoCancelacion(false);
    }
    };

    // Función para determinar si una solicitud puede cancelarse parcialmente
    const puedeSerCanceladaParcialmente = (solicitud) => {
    if (solicitud.estado !== 'aprobada') return false;
    const diasDisponibles = solicitud.fechas.filter(fecha => {
      const esFechaPasada = esFechaPasadaOHoy(fecha);
      const yaFueCancelado = (solicitud.diasCancelados || []).includes(fecha);
      return !esFechaPasada && !yaFueCancelado;
    });

    return diasDisponibles.length> 0; // Necesita al menos 1 días futuros para cancelar parcialmente
    };

    const diasDisfrutados = (solicitud) => {
      const { fechas, diasCancelados = [] } = solicitud;

      // Filtrar las fechas que ya han pasado y no están en la lista de días cancelados
      const fechasDisfrutadas = fechas.filter(fecha => {
        const fechaYaDisfrutada = esFechaPasadaOHoy(fecha);
        const fechaYaCancelada = diasCancelados.includes(fecha);

        return fechaYaDisfrutada && !fechaYaCancelada;
      });

      return fechasDisfrutadas.length;
    };

  return (
    <>
      {/* AppBar */}
      <AppBar
        sx={{ background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 50%, #1565c0 100%)',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
              zIndex: 1100
            }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
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
            <ArrowBackIosNew />
            </IconButton>

            {/* Título */}
            <Box sx={{ my:0.5, textAlign: 'center', flex: 1}}>
            <Typography 
                variant="h5" 
                fontWeight="bold" 
                sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
                }}
            >
                Historial de Solicitudes
            </Typography>
            <Typography 
                variant="caption" 
                sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
                }}
            >
                Filtra y Exporta las solicitudes
            </Typography>
            </Box>
            <IconButton
            edge="end"
            color="inherit"
            sx={{
                cursor: 'default'
            }}
            >
            <History  sx={{fontSize:'2rem'}}/>
            </IconButton>
        </Toolbar>
        </AppBar>

      <Container maxWidth="xl" sx={{ pb: 4, px:1 }}>
        {/* Estadísticas rápidas con Grid actualizado */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper onClick={() => handleClickEstadistica('aprobada')}
              sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50', borderRadius:3 }}>
              <Typography variant="h4" fontWeight={600} color="success.main">
                {estadisticasTotales.aprobadas}
              </Typography>
              <Typography variant="body2">Aprobadas</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper onClick={() => handleClickEstadistica('denegada')}
              sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50', borderRadius:3 }}>
              <Typography variant="h4" fontWeight={600} color="error.main">
                {estadisticasTotales.denegadas}
              </Typography>
              <Typography variant="body2">Denegadas</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper onClick={() => handleClickEstadistica('cancelado')}
              sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50', borderRadius:3 }}>
              <Typography variant="h4" fontWeight={600} color="warning.main">
                {estadisticasTotales.canceladas}
              </Typography>
              <Typography variant="body2">Canceladas</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper onClick={() => handleClickEstadistica('total')}
              sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50', borderRadius:3 }}>
              <Typography variant="h4" fontWeight={600} color="primary.main">
                {estadisticasTotales.total}
              </Typography>
              <Typography variant="body2">Total</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Controles y filtros */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2, mt:2 }}>
            {/* Barra de búsqueda y controles */}
            <Box sx={{ display: 'flex', flexDirection:'column', gap: 2, mb: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Buscar empleado, comentarios..."
                value={filtros.busqueda}
                fullWidth
                onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                slotProps={{
                    input:{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                endAdornment: filtros.busqueda && (
                <InputAdornment position="end">
                    <IconButton
                    size="small"
                    onClick={() => handleFiltroChange('busqueda', '')}
                    edge="end"
                    aria-label="limpiar búsqueda"
                    sx={{
                        '&:hover': {
                        bgcolor: 'action.hover',
                        transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease'
                    }}
                    >
                    <Clear fontSize="small" />
                    </IconButton>
                </InputAdornment>
                ),
                },
                }}
                sx={{ }}
                size="small"
              />
              <Box sx={{display:'flex', justifyContent:'space-between', width:'100%',}}>
              
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                sx={{
                  py:1.5,
                  borderColor: 'purple.main',
                  color: 'purple.main',
                  '&:hover': { bgcolor: 'purple.50', borderColor: 'purple.main' }
                }}
              >
                Filtros {mostrarFiltros ? <ExpandLess /> : <ExpandMore />}
              </Button>

              <Button
                variant="contained"
                startIcon={exportando ? <CircularProgress size={16} /> : <GetApp />}
                onClick={handleExportarCSV}
                disabled={exportando || solicitudes.length === 0}
                sx={{
                  bgcolor: 'purple.main',
                  '&:hover': { bgcolor: 'purple.dark' }
                }}
              >
                {exportando ? 'Exportando...' : 'Exportar CSV'}
              </Button>
              </Box>
            </Box>

            {/* Panel de filtros */}
            <Collapse in={mostrarFiltros}>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Estado</InputLabel>
                    <Select
                      value={filtros.estado}
                      label="Estado"
                      onChange={(e) => handleFiltroChange('estado', e.target.value)}
                    >
                      <MenuItem value="todos">Todos los estados</MenuItem>
                      <MenuItem value="aprobada">Aprobadas</MenuItem>
                      <MenuItem value="denegada">Denegadas</MenuItem>
                      <MenuItem value="cancelado">Canceladas</MenuItem>
                      <MenuItem value="pendiente">Pendientes</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Empleado</InputLabel>
                    <Select
                      value={filtros.empleado}
                      label="Empleado"
                      onChange={(e) => handleFiltroChange('empleado', e.target.value)}
                    >
                      <MenuItem value="">Todos los empleados</MenuItem>
                      {empleadosDisponibles.map(empleado => (
                        <MenuItem key={empleado} value={empleado}>
                          {datosUsuarios[empleado]?.nombre || empleado}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Año</InputLabel>
                    <Select
                      value={filtros.año}
                      label="Año"
                      onChange={(e) => handleFiltroChange('año', e.target.value)}
                    >
                      {añosDisponibles.map(año => (
                        <MenuItem key={año} value={año}>
                          {año}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                    <Typography variant="body2">
                      {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} encontrada{solicitudes.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
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
              Cargando historial...
            </Typography>
          </Box>
        ) : solicitudes.length === 0 ? (
          <Alert severity="info">
            No se encontraron solicitudes con los filtros aplicados.
          </Alert>
        ) : (
          <>
            {/* Lista paginada */}
            <Box sx={{ mb: 3 }}>
              {solicitudesPaginadas.map((solicitud) => {
                const userData = datosUsuarios[solicitud.solicitante] || {};
                const esExpandida = solicitudesExpanded[solicitud.id];
                const fechaResolucion = solicitud.fechaAprobacionDenegacion || 
                                      solicitud.fechaCancelacion || null;

                return (
                  <Card key={solicitud.id} sx={{ mb: 2 }}>
                    <CardContent sx={{ p: 2 }}>
                      {/* Header de la solicitud */}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleToggleExpanded(solicitud.id)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                            {(userData.nombre || solicitud.solicitante).charAt(0).toUpperCase()}
                          </Avatar>
                          
                          <Box>
                            <Typography variant="body1" fontWeight={600}>
                              {formatearNombre(userData.nombre)}
                            </Typography>
                            <Typography variant="subtitle2">
                              {formatearFechaCorta(solicitud.fechaSolicitud)}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            icon={getIconoEstado(solicitud.estado)}
                            label={solicitud.estado==='cancelado' ? "Cancelada" : solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                            color={getColorEstado(solicitud.estado)}
                            size="small"
                          />
                          
                          <Chip
                            label={formatearTiempoVacas(solicitud.horasSolicitadas)}
                            size="small"
                            variant="outlined"
                          />
                          
                          {esExpandida ? <ExpandLess /> : <ExpandMore />}
                        </Box>
                      </Box>

                      {/* Detalles expandibles */}
                      <Collapse in={esExpandida}>
                        <Divider sx={{ my: 2 }} />
                        
                        {/* Grid con sintaxis actualizada en detalles */}
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{bgcolor:'azul.fondo'}}>
                            <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarToday fontSize="small" />
                               <strong> Fechas de Vacaciones</strong>
                            </Typography>
                            </Box>
                            <Box sx={{ ml: 3 }}>
                                {solicitud.fechas && solicitud.fechas.length > 0 ? (
                                solicitud.fechas.length === 1 ? (
                                    <Typography variant="body1">
                                    • {formatearFechaCorta(solicitud.fechas[0])}
                                    </Typography>
                                ) : (
                                    <>
                                    <Box 
                                        sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'grey.50' },
                                        borderRadius: 1,
                                        p: 0.5
                                        }} 
                                        onClick={() => {
                                        setFechasExpanded(prev => ({ 
                                            ...prev, 
                                            [solicitud.id]: !prev[solicitud.id] 
                                        }));
                                        }}
                                    >

                                       <Typography variant="body1" >
                                          {solicitud?.esCancelacionParcial 
                                          ?"Cancelación Parcial: "
                                          :"Solicitado Inicialmente: " 
                                          }
                                          <strong>{formatearTiempoVacasLargo(solicitud.horasSolicitadas)}</strong>
                                          
                                        </Typography>
                                      
                                        {fechasExpanded[solicitud.id] ? <ExpandLess sx={{ ml:2}}/> : <ExpandMore sx={{ ml:2 }}/>}
                                    </Box>
                                    <Collapse in={fechasExpanded[solicitud.id]}>
                                        <Divider sx={{bgcolor:'black', width:'14rem'}} />
                                        <Box sx={{ ml: 2, mt: 1 }}>
                                {solicitud.fechas.map(f => (
                                  !solicitud.diasCancelados?.includes(f) ? (
                                    <Typography  key={f} variant="body1" display="block" sx={{ }}>
                                        • {formatearFechaCorta(f)}
                                    </Typography>
                                  ) : (
                                    <Typography  key={f} variant="body1" display="block" sx={{ textDecoration: 'line-through', color: 'grey.600' }}>
                                        • {formatearFechaCorta(f)}
                                    </Typography>
                                    )))}

                                        </Box>
                                    </Collapse>
                                    </>
                                )
                                ) : (
                                <Typography variant="body1" color="text.secondary">
                                    Sin fechas especificadas
                                </Typography>
                                )}
                            </Box>
                             {/* Dias Cancelados */}
                            {solicitud.diasCancelados && solicitud.diasCancelados.length > 0 && (
                              <Alert 
                                severity="warning" 
                                sx={{ mt: 1 }}
                              >
                                <Typography component="div" variant='body1'>
                                  <strong>Días cancelados anteriormente:</strong>
                                  <br/>
                                  {solicitud.diasCancelados.map((fecha, index) => (
                                    <div key={index}>
                                      {formatearFechaCorta(fecha)}
                                    </div>
                                  ))}
                                </Typography>
                              </Alert>
                            )}
                            </Grid>


                          <Grid size={{ xs: 12, md: 6 }} >
                            <Box sx={{bgcolor:'azul.fondo'}}>
                            <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTime fontSize="small" />
                              <strong>Información Temporal</strong>
                            </Typography>
                            </Box>
                            <Box sx={{ ml: 3 }}>
                              <Typography variant="body1">
                                • Solicitado: {formatearFechaCorta(solicitud.fechaSolicitud)}
                              </Typography>
                              {fechaResolucion && (
                              <Typography variant="body1">
                                • {getEstadoTexto(solicitud.estado)}: {formatearFechaCorta(fechaResolucion)}
                              </Typography>
                              )}
                              {solicitud?.esCancelacionParcial ? (
                              <Typography variant="body1" color="warning.main">
                                • Duración {formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                              </Typography>
                              ) : (

                              <Typography variant="body1">
                                • Duración original: {formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                              </Typography>
                              )}
                              {solicitud?.diasCancelados && (
                              <Typography variant="body1" color="warning.main">
                                • Cancelado Previamente: {formatearTiempoVacasLargo(solicitud.diasCancelados.length * 8)}
                              </Typography>
                              )}
                              {solicitud?.diasCancelados && solicitud?.estado==="cancelado" && (
                              <Typography variant="body1" color="warning.main">
                                • Cancelado Ahora: {formatearTiempoVacasLargo(solicitud.horasSolicitadas-(solicitud.diasCancelados.length * 8))}
                              </Typography>)}





                            </Box>
                          </Grid>

                          {solicitud.comentariosSolicitante && (
                            <Grid size={12}>
                                <Box sx={{bgcolor:'azul.fondo'}}>
                              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1}} gutterBottom>
                                <AccountCircleOutlined fontSize="small" />
                                <strong>Comentarios del Empleado</strong>
                              </Typography>
                              </Box>
                              <Typography variant="body1" sx={{ fontStyle: 'italic', pl: 2 }}>
                                "{solicitud.comentariosSolicitante}"
                              </Typography>
                            </Grid>
                          )}

                          {solicitud.comentariosAdmin && (
                            <Grid size={12}>
                            <Box sx={{bgcolor:'azul.fondo'}}>
                              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1}} gutterBottom>
                                <LocalPoliceOutlined fontSize="small" />
                                <strong>Comentarios del Administrador</strong>
                              </Typography>
                              </Box>
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', pl: 2, color: solicitud.estado==='denegada' ? 'error.main' : 'verde.main' }}>
                                "{solicitud.comentariosAdmin.trimStart()}"
                              </Typography>
                            </Grid>
                          )}

                          {solicitud.motivoCancelacion && (
                            <Grid size={12}>
                            <Box sx={{bgcolor:'azul.fondo'}}>
                              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1}} gutterBottom>
                                <CancelOutlined fontSize="small" />
                                <strong>Motivo de Cancelación</strong>
                              </Typography>
                              </Box>
                              <Typography variant="body1" sx={{ fontStyle: 'italic', pl: 2, color: 'naranja.main' }}>
                                "{solicitud.motivoCancelacion}"
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Collapse>
                      {puedeSerCanceladaParcialmente(solicitud) && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            fullWidth
                            
                            onClick={() => handleAbrirCancelacionParcial(solicitud)}
                            sx={{ py:1, mb:-1, mt: 2, borderRadius:2 }}
                        >
                            <CancelOutlined sx={{fontSize:'1.5rem', mr:2}} />
                            <Typography fontSize={'1.1rem'}>
                            Cancelar Parcialmente
                            </Typography>
                        </Button>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPaginas}
                  page={paginaActual}
                  onChange={(event, page) => setPaginaActual(page)}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        )}
        {/*Dialog Cancelación Parcial */}
        <Dialog
        open={dialogCancelarParcial}
        onClose={() => !procesandoCancelacion && setDialogCancelarParcial(false)}
        maxWidth="md"
        fullWidth
        >
        <DialogTitle variant='div' display='flex' flexDirection='column' alignItems='center' sx={{ }}>
            <Typography variant="span" fontSize='1.25rem' fontWeight="bold">
            Cancelar Parcialmente 
            </Typography>
            <Typography variant='span' fontSize="1.25rem" sx={{color: 'naranja.main', fontWeight:'bold'}}>
             {solicitudParaCancelar && (datosUsuarios[solicitudParaCancelar.solicitante]?.nombre || solicitudParaCancelar.solicitante)}
            </Typography>
        </DialogTitle>
        
        <DialogContent>
            {solicitudParaCancelar && (
            <Box sx={{ mb: 3,  }}>
                <Typography textAlign='center' variant="body1" fontWeight='bold' >
                Solicitud original: {formatearTiempoVacasLargo(solicitudParaCancelar.horasSolicitadas)}
                </Typography>
                 {diasDisfrutados(solicitudParaCancelar) > 0 && (
                <Typography variant="body1" color="success.main" textAlign='center'  sx={{ }}>
                   {diasDisfrutados(solicitudParaCancelar)}{diasDisfrutados(solicitudParaCancelar)==1?" dia disfrutado ":" dias disfrutados "}
                </Typography>
                )}   
                {solicitudParaCancelar.diasCancelados && solicitudParaCancelar.diasCancelados.length > 0 && (
                <Typography variant="body1" color="warning.main" textAlign='center' gutterBottom sx={{ }}>
                   {solicitudParaCancelar.diasCancelados.length}{solicitudParaCancelar.diasCancelados.length==1?" dia cancelado ":" dias cancelados "}anteriormente
                </Typography>
                )}       
                <SelectorDiasCancelacion
                fechasDisponibles={solicitudParaCancelar.fechas}
                onDiasSeleccionados={setDiasACancelar}
                diasSeleccionados={diasACancelar}
                diasYaCancelados={solicitudParaCancelar.diasCancelados || []}
                />
                
                <TextField
                fullWidth
                multiline
                rows={3}
                label="Motivo de la cancelación parcial"
                value={motivoCancelacionParcial}
                onChange={(e) => setMotivoCancelacionParcial(e.target.value)}
                placeholder="Ej: El empleado se reincorporó antes de lo previsto por motivos familiares"
                disabled={procesandoCancelacion}
                required
                helperText="Especifica por qué se cancelan solo estos días"
                sx={{ mt: 2 }}
                />
            </Box>
            )}
        </DialogContent>
        
        <DialogActions sx={{display:'flex', justifyContent:'space-between', px:2,pb:2}}>
            <Button
            onClick={() => setDialogCancelarParcial(false)}
            disabled={procesandoCancelacion}
            color="primary"
            variant="outlined"
            sx={{textTransform: 'none', py:1.5}}
            >
            <Typography fontSize={'1.1rem'}>
            Cerrar
            </Typography>
            </Button>
            <Button
            onClick={handleConfirmarCancelacionParcial}
            disabled={procesandoCancelacion || diasACancelar.length === 0}
            variant="contained"
            color="warning"
            sx={{textTransform: 'none', py:1.5}}
            startIcon={procesandoCancelacion ? <CircularProgress size={20} /> : <CancelOutlined />}
            >
            <Typography fontSize={'1.1rem'}>
            {procesandoCancelacion ? 'Procesando...' : `Cancelar ${diasACancelar.length} día${diasACancelar.length==1?"":'s'}`}
            </Typography>
            </Button>
        </DialogActions>
        </Dialog>

      </Container>
    </>
  );
};

export default HistorialSolicitudes;
