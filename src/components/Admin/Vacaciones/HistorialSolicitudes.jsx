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
  Clear,
  RemoveDoneRounded
} from '@mui/icons-material';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useUIStore } from '../../../stores/uiStore';
import SelectorDiasCancelacion from './SelectorDiasCancelacion';
import { formatearFechaCorta,formatearFechaLarga, ordenarFechas } from '../../../utils/dateUtils';
import { formatearNombre, capitalizeFirstLetter } from '../../Helpers';
import { formatearTiempoVacas, formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';


const HistorialSolicitudes = () => {
  const navigate = useNavigate();
  const {
    loadHistorialSolicitudesConCancelaciones,
    exportarHistorialCSV,
    obtenerDatosUsuarios,
    obtenerDiasCancelados,
    obtenerDiasDisfrutados,
    cancelarSolicitudParcial,
    cancelarSolicitudVacaciones
  } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudesOriginales, setSolicitudesOriginales] = useState([]); // Para mantener todas las solicitudes sin filtros
  const [datosUsuarios, setDatosUsuarios] = useState({});
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [dialogCancelarParcial, setDialogCancelarParcial] = useState(false);
  const [solicitudParaCancelar, setSolicitudParaCancelar] = useState(null);
  const [diasACancelar, setDiasACancelar] = useState([]);
  const [motivoCancelacionParcial, setMotivoCancelacionParcial] = useState('');
  const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);
  const [estadisticaActivaFiltro, setEstadisticaActivaFiltro] = useState(''); // Para saber qué estadística está filtrando
  const [solicitudExpandida, setSolicitudExpandida] = useState(null);
  const [cancelacionesExpanded, setCancelacionesExpanded] = useState({});
  const [cancelacionesFechasExpanded, setCancelacionesFechasExpanded] = useState({});

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
        
        const historial = await loadHistorialSolicitudesConCancelaciones(filtrosSinBusqueda);

        const emails = [...new Set(historial.map(s => s.solicitante))];
        if (emails.length > 0) {
            const usuarios = await obtenerDatosUsuarios(emails);
            setDatosUsuarios(usuarios);
            setSolicitudesOriginales(historial);
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
            setSolicitudesOriginales(historial)
            setSolicitudes(historial);
        }
        } catch (error) {
        showError('Error cargando el historial de solicitudes: ' + error.message);
        } finally {
        setLoading(false);
        }
    };

    cargarHistorial();
    }, [filtros, loadHistorialSolicitudesConCancelaciones, obtenerDatosUsuarios]);


  // Empleados disponibles para filtro
  const empleadosDisponibles = useMemo(() => {
    return [...new Set(solicitudes.map(s => s.solicitante))].sort();
  }, [solicitudes]);

  // ✅ Estadísticas TOTALES (fijas, no cambian con filtros)
  const estadisticasTotales = useMemo(() => {
    const stats = {
      total: solicitudesOriginales.length,
      aprobadas: 0,
      denegadas: 0,
      canceladas: 0,
      pendientes: 0,
      diasTotales: 0,
      empleadosUnicos: new Set(),
      promedioHorasPorSolicitud: 0
    };
    
    let horasTotales = 0;
    
    solicitudesOriginales.forEach(s => {
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
  }, [solicitudesOriginales]);

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
      setPaginaActual(1);
    }
  };

    const toggleCancelacionesExpanded = (solicitudId) => {
    setCancelacionesExpanded(prev => ({
      ...prev,
      [solicitudId]: !prev[solicitudId]
    }));
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
      case 'aprobada': return 'verde';
      case 'denegada': return 'rojo';
      case 'cancelado': return 'naranja';
      case 'pendiente': return 'azul';
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

    try {
        setProcesandoCancelacion(true);
        let resultado
        if (solicitudParaCancelar.horasSolicitadas<8){
         resultado = await cancelarSolicitudVacaciones(
          solicitudParaCancelar,
          motivoCancelacionParcial,
          true
         )
         showSuccess(
        `Cancelación procesada correctamente. (${formatearTiempoVacasLargo(solicitudParaCancelar.horasSolicitadas)})`
        );
        } else {
        resultado = await cancelarSolicitudParcial(
        solicitudParaCancelar,
        diasACancelar,
        motivoCancelacionParcial,
        true // es admin
      );
      showSuccess(
      `Cancelación parcial procesada correctamente. (${resultado.diasCancelados} días)`
      );
      }
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
        const historial = await loadHistorialSolicitudesConCancelaciones(filtros)
        setSolicitudes(historial)
        
    } catch (error) {
        showError(`Error en cancelación parcial: ${error.message}`);
    } finally {
        setProcesandoCancelacion(false);
    }
    };

    // Función para determinar si una solicitud puede cancelarse parcialmente
     const puedeGestionarSolicitud = (solicitud) => {
    const diasCancelados = obtenerDiasCancelados(solicitud.cancelacionesParciales || []);
    const diasDisfrutados = obtenerDiasDisfrutados(solicitud);
    const diasDisponibles = solicitud.fechas.filter(fecha => {
      const yaFueCancelado = diasCancelados.includes(fecha);
      const yaDisfrutado = diasDisfrutados.includes(fecha);
      // ✅ Admin puede cancelar días pasados, por eso no verificamos esFechaPasadaOHoy
      return !yaFueCancelado && !yaDisfrutado;
    });

    const esHorasSueltas = solicitud.horasSolicitadas < 8 && solicitud.fechas.length === 1;

    return {
      puedeCancelarParcialmente: solicitud.estado === 'aprobada'
        //&& !esHorasSueltas
        && !solicitud.esAjusteSaldo, // Admin sin restricción de fechas pasadas
      horasDisponibles:esHorasSueltas ? solicitud.horasSolicitadas : diasDisponibles,
      esHorasSueltas
    };
  };

    const SolicitudCard = ({ solicitud }) => {
      const { puedeCancelarParcialmente, horasDisponibles } = puedeGestionarSolicitud(solicitud);
      const colorEstado = getColorEstado(solicitud.estado);
      const diasCancelados = solicitud.fechasCanceladas || [];
      const diasDisfrutados = obtenerDiasDisfrutados(solicitud);
      const cancelacionesParciales = solicitud.cancelacionesParciales || [];
      const diasCanceladosParcialmente=obtenerDiasCancelados(cancelacionesParciales)
      const tieneCancelacionesParciales = cancelacionesParciales.length > 0;
      const userData = datosUsuarios[solicitud.solicitante] || {};
      const esExpandida = solicitudesExpanded[solicitud.id];
  
      return (
        <Card sx={{ mb: 3, borderLeft: `4px solid ${colorEstado}.main` }}>
          <CardContent>
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

              
              <Box>
                <Typography fontSize='1.5rem' fontWeight={600}>
                  {formatearNombre(userData.nombre)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              
              <Chip
                label={formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                sx={{fontSize:'1rem', fontWeight:'bold'}}
                variant="outlined"
              />
              
              {esExpandida ? <ExpandLess sx={{fontSize:'2rem'}}/> : <ExpandMore sx={{fontSize:'2rem'}}/>}
            </Box>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{xs:12, md:6}}>
                <Box sx={{ display: 'flex', justifyContent:"space-between", alignItems: 'center', gap: 1 }}>
                  <Box sx={{flex:1}} >
                    <Chip
                      label={solicitud.estado=='cancelado'?"CANCELADA": solicitud.estado.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: `${colorEstado}.main`,
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                    {solicitud?.fechaEdicion && (
                      <Chip
                        label="MODIFICADA"
                        size="small"
                        sx={{ 
                          mt:1,
                          bgcolor: 'grey', 
                          color: 'white', 
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </Box>
                  <Box>
                  <Typography variant="body1" textAlign="center" fontWeight={600} sx={{color:"azul.main"}} >
                    Solicitada: {formatearFechaCorta(solicitud.fechaSolicitudOriginal||solicitud.fechaSolicitud)}
                  </Typography>
                  {solicitud.fechaEdicion && (
                    <Typography variant="body1" textAlign="center" fontWeight={600} sx={{color:"naranja.main"}}>
                      Modificada: {formatearFechaCorta(solicitud.fechaSolicitud)}
                    </Typography>
                  )}
                  {solicitud.fechaCancelacion && (
                    <Typography variant="body1" textAlign="center" fontWeight={600} sx={{color:"dorado.main"}}>
                      Cancelada: {formatearFechaCorta(solicitud.fechaCancelacion)}
                    </Typography>
                  )}
                   {solicitud.estado === 'aprobada' && (
                    <Typography variant="body1" textAlign="center" fontWeight={600} sx={{color:"verde.main"}}>
                      Aprobada: {formatearFechaCorta(solicitud.fechaAprobacionDenegacion)}
                    </Typography>
                  )}
                  {solicitud.estado === 'denegada' && (
                    <Typography variant="body1" textAlign="center" fontWeight={600} sx={{color:"rojo.main"}}>
                      Denegada: {formatearFechaCorta(solicitud.fechaAprobacionDenegacion)}
                    </Typography>
                  )}
                    {tieneCancelacionesParciales && (
              
                    <Typography variant="body1"  textAlign="center" fontWeight={600} sx={{color:"naranja.main"}}>
                      {cancelacionesParciales.length} Cancelación{cancelacionesParciales.length > 1 ? 'es' : ''} Parcial{cancelacionesParciales.length > 1 ? 'es' : ''}
                    </Typography>
                      
                    )}
                  </Box>
                </Box>
              <Collapse in={esExpandida}>
              <Divider sx={{ my: 2 }} />
              {solicitud?.esAjusteSaldo 
                          ? <>
                          <Typography  sx={{ fontWeight: 600, fontSize:'1.5rem', mt:3, textAlign:'center' }}>
                            Ajuste de saldo             
                           </Typography>
                           <Typography  sx={{ fontWeight: 600, fontSize:'1.4rem', textAlign:'center', color: 
                              solicitud.tipoAjuste=="reducir"?"rojo.main":solicitud.tipoAjuste=="añadir"?"verde.main":"azul.main" }}>
                           {capitalizeFirstLetter(solicitud.tipoAjuste)} {formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                           </Typography>
                          </>
                          : <Typography  sx={{ fontWeight: 600, fontSize:'1.2rem', mt:3 }}>
                            Pedido Originalmente: {formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                          </Typography>
                            }
                {/*  Mostrar saldos en solicitudes aprobadas */}
                {solicitud.horasDisponiblesAntes !== undefined && solicitud.horasDisponiblesAntes !=solicitud.horasDisponiblesDespues && (
                  <Box sx={{ mt: 1,  bgcolor: solicitud.esAjusteSaldo 
                                    ? solicitud.tipoAjuste=="reducir"?"rojo.fondo":solicitud.tipoAjuste=="añadir"?"verde.fondo":"azul.fondo"
                                    : 'verde.fondo'
                                    ,p:1,mb:2 }}>
                    <Typography variant="h6" display="block">
                      Saldo al aprobar {solicitud?.esAjusteSaldo?'el ajuste':'la solicitud'}
                    </Typography>
                    <Divider  sx={{bgcolor:'black', mt:0}} />
                    <Grid container sx={{ mt: 0.5 }}>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="h6" display="block">
                          Antes: {formatearTiempoVacasLargo(solicitud.horasDisponiblesAntes)}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="h6" display="block">
                          Después: {formatearTiempoVacasLargo(solicitud.horasDisponiblesDespues || 0)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
                
  
            {/*  Lista de fechas con estados visuales */}
            {!solicitud?.esAjusteSaldo && (
            <>
            {solicitud.fechas.length === 1 ? (
              <Box  justifyContent='space-between' alignItems={'center'} sx={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    p: 1,
                    bgcolor: `${colorEstado}.fondo`,
                    borderRadius: 1,
                    '&:hover': { bgcolor: `${colorEstado}.fondoFuerte` }
              }}>
              <Typography fontSize={'1.15rem'}>
                {formatearFechaLarga(solicitud.fechas[0])}
              </Typography>
              {solicitud.horasSolicitadas<8 && (
                <Chip
                  label ={formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                  size="small"
                        sx={{ 
                          py:0.5,
                          
                          bgcolor: 'azul.main', 
                          color: 'white', 
                          fontWeight: 700,
                        }}
                      />
              )}
              </Box>
            ) : (
              <>
                <Box
                  onClick={() => setSolicitudExpandida(solicitudExpandida === solicitud.id ? null : solicitud.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:'space-between',
                    cursor: 'pointer',
                    p: 1,
                    bgcolor: `${colorEstado}.fondo`,
                    borderRadius: 1,
                    '&:hover': { bgcolor: `${colorEstado}.fondoFuerte` },
                    
                  }}
                >
                  <Typography variant="h6" >
                    Fechas de la solicitud
                  </Typography>
                  {solicitudExpandida === solicitud.id ? <ExpandLess /> : <ExpandMore />}
                </Box>
                
                <Collapse in={solicitudExpandida === solicitud.id}>
                  <Box sx={{ ml: 2, mb: 2 }}>
                    {ordenarFechas(solicitud.fechas).map(fecha => {
                      const estaCancelado = diasCanceladosParcialmente.includes(fecha);
                      const estaDisfrutado = diasDisfrutados.includes(fecha);
                      const resto = diasCancelados.includes(fecha)
                      
                      return (
                        <Typography 
                          key={fecha} 
                          fontSize={'1.1rem'} 
                          sx={{ 
                            mb: 0.5,
                            ...(resto && {
                              
                              color: 'rojo.main'
                            }),
                            ...(estaCancelado && {
                              
                              color: 'naranja.main'
                            }),
                            ...(estaDisfrutado && {
                              fontStyle: 'italic',
                              color: 'success.main'
                            })
                          }}
                        >
                          • {formatearFechaCorta(fecha)}
                          {estaCancelado && <Box component='span' color='black'> (cancelado)</Box>}
                          {estaDisfrutado &&  <Box component='span' color='black' fontStyle='normal'> (disfrutado)</Box>}
                          {resto && <Box component='span' color='black'> (cancelado)</Box>}
                        </Typography>
                      );
                    })}
                  </Box>
                </Collapse>
              </>
            )}
            </>
           )}
            {solicitud.comentariosSolicitante && (
              <Box  sx={{mt:1, p:1, bgcolor:solicitud.esAjusteSaldo
                  ?
                  solicitud.tipoAjuste === 'añadir' ? 'verde.fondo' : 
                  solicitud.tipoAjuste === 'reducir' ? 'rojo.fondo' : 'azul.fondo'
                  
                  :
                  solicitud.estado === 'aprobada' ? 'verde.fondo' : 
                  solicitud.estado === 'cancelado' ? 'dorado.fondo' : 'rojo.fondo'}}>

              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                "{solicitud.comentariosSolicitante}"
              </Typography>
              </Box>
            )}
          {solicitud.comentariosAdmin && (
              <Alert 
                severity={solicitud.esAjusteSaldo
                  ?
                  solicitud.tipoAjuste === 'añadir' ? 'success' : 
                  solicitud.tipoAjuste === 'reducir' ? 'error' : 'info'
                  
                  :
                  solicitud.estado === 'aprobada' ? 'success' : 
                  solicitud.estado === 'cancelado' ? 'info' : 'error'
                } 
                sx={{ mt: 1 }}
              >
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  <strong>Respuesta Jefe: </strong>{solicitud.comentariosAdmin}
                </Typography>
              </Alert>
            )}
            
            {/* Acordeón de cancelaciones parciales */}
            {tieneCancelacionesParciales && (
              <>
                <Divider sx={{ my: 2, bgcolor:"black" }} />
                <Typography  sx={{ mb: 1,  fontWeight: 600, fontSize:'1.2rem' }}>
                 Cancelado Parcialmente: {formatearTiempoVacasLargo(diasCanceladosParcialmente.length * 8)}
                </Typography>         
                <Box 
                  onClick={() => toggleCancelacionesExpanded(solicitud.id)}
                  bgcolor='naranja.fondo'
                  sx={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1,
                   
                  }}
                >
                  <Typography variant="body1"  sx={{ flexGrow: 1 }}>
                    {cancelacionesParciales.length} Cancelación{cancelacionesParciales.length > 1 ? 'es' : ''} Parcial{cancelacionesParciales.length > 1 ? 'es' : ''}
                  </Typography>
                  {cancelacionesExpanded[solicitud.id] ? <ExpandLess /> : <ExpandMore />}
                </Box>
                
                <Collapse in={cancelacionesExpanded[solicitud.id]}>
                  <Box sx={{ ml: 2, mt: 1 }}>
                    {cancelacionesParciales.map((cancelacion, index) => (
                      <Paper 
                        key={cancelacion.id} 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          mb: 1, 
                          bgcolor: 'grey.50', 
                          borderLeft: '3px solid',
                          borderColor: 'warning.main'
                        }}
                      >
                        <Typography fontSize={'1.15rem'} display="block" sx={{ bgcolor:'dorado.fondo', fontWeight: 600, mb: 0.5 }}>
                          Cancelación #{index + 1}
                        </Typography>
                        {/* Mostrar saldos antes y después */}
                        <Grid container  sx={{  }}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle1" display="block" >
                              • Saldo antes: {formatearTiempoVacasLargo(cancelacion.horasDisponiblesAntesCancelacion || 0)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle1" display="block" >
                              • Saldo después: {formatearTiempoVacasLargo(cancelacion.horasDisponiblesDespuesCancelacion || 0)}
                            </Typography>
                          </Grid>
                        </Grid>
                        <Typography variant="subtitle1" display="block" bgcolor="grey.00">
                          • Días Cancelados:
                        </Typography>
                        {cancelacion.fechasCanceladas.map(f => (
                          <Typography key={f} variant="subtitle1" display="block" sx={{ ml: 2, color:'naranja.main' }}>
                            {formatearFechaCorta(f)}
                          </Typography>
                        ))}
                        <Typography variant="subtitle1" display="block" >
                          • Cancelado el: {formatearFechaCorta(cancelacion.fechaCancelacion)}
                        </Typography>
                        <Typography variant="subtitle1" display="block">
                          • Devuelto: {formatearTiempoVacasLargo(cancelacion.horasDevueltas)}
                        </Typography>
                        <Box display='flex' >
                          <Box>
                        <Typography variant="subtitle1" display="inline" >
                          • Motivo:
                        </Typography>
                        <Typography variant="span"  sx={{ fontStyle:'italic'}}>
                          {' '+cancelacion.motivoCancelacion}
                        </Typography>
                        </Box>
                        </Box>                    
                        <Typography variant="subtitle1" display="block" color="error.main">
                          • Cancelado por {datosUsuarios[cancelacion.procesadaPor].nombre}
                        </Typography>
                      
                      </Paper>
                    ))}
                  </Box>
                </Collapse>
              </>
            )}
  
  
                {/*  Mostrar saldos en solicitudes canceladas */}
                {solicitud.horasDisponiblesAntesCancelacion !== undefined && 
                solicitud.horasDisponiblesAntesCancelacion!=solicitud.horasDisponiblesDespuesCancelacion && (
                <>
                <Divider sx={{ my: 2, bgcolor:"black" }} />
                              {solicitud.fechas.length === 1? (
                                <>
                                <Typography  sx={{ fontWeight: 600, fontSize:'1.2rem', mb:1}}>
                                Pedido Cancelado: {formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                              </Typography>  
                            <Box  justifyContent='space-between' alignItems={'center'} sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  p: 1,
                                  bgcolor: `dorado.fondo`,
                                  borderRadius: 1,
                                  '&:hover': { bgcolor: `dorado.fondoFuerte` }
                            }}>
                            <Typography fontSize={'1.15rem'}>
                              {formatearFechaLarga(solicitud.fechas[0])}
                            </Typography>
                            {solicitud.horasSolicitadas<8 && (
                              <Chip
                                label ={formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                                size="small"
                                      sx={{ 
                                        py:0.5,
                                        
                                        bgcolor: 'rojo.main', 
                                        color: 'white', 
                                        fontWeight: 700,
                                      }}
                                    />
                            )}
                            </Box>
                            </>
                            ) : (
                            <>
                              <Typography  sx={{ fontWeight: 600, fontSize:'1.2rem', mb:1}}>
                                Pedido Cancelado: {formatearTiempoVacasLargo(horasDisponibles.length*8)}
                              </Typography> 
                               <Box
                                onClick={() => setCancelacionesFechasExpanded(cancelacionesFechasExpanded === solicitud.id ? null : solicitud.id)}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent:'space-between',
                                  cursor: 'pointer',
                                  p: 1,
                                  bgcolor: `rojo.fondo`,
                                  borderRadius: 1,
                                  '&:hover': { bgcolor: `rojo.fondoFuerte` },
                                  
                                }}
                              >
                  <Typography variant="body1">
                    Fechas Canceladas 
                  </Typography>
                  {cancelacionesFechasExpanded === solicitud.id ? <ExpandLess /> : <ExpandMore />}
                </Box>
                
                <Collapse in={cancelacionesFechasExpanded === solicitud.id}>
                  <Box sx={{ ml: 2, mb: 2 }}>
                    {ordenarFechas(diasCancelados).map(fecha => {
                      
                      
                      return (
                        <Typography 
                          key={fecha} 
                          fontSize={'1.1rem'} 
                          sx={{ 
                            color:'rojo.main',
                            mb: 0.5,
                          }}
                        >
                          • {formatearFechaCorta(fecha)} 
                        </Typography>
                      );
                    })}
                  </Box>
                </Collapse>
                 </>
                  )}
                <Divider sx={{ my: 2, bgcolor:"black" }} />
                  <Box sx={{ mt: 1, bgcolor: 'dorado.fondo',p:1,mb:1 }}>
                    <Typography variant="h6" display="block">
                      Saldo al cancelar la solicitud
                    </Typography>
                    <Divider  sx={{bgcolor:'black', mt:0}} />
                    <Grid container sx={{ mt: 0.5 }}>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="h6" display="block">
                          Antes: {formatearTiempoVacasLargo(solicitud.horasDisponiblesAntesCancelacion)}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="h6" display="block">
                          Después: {formatearTiempoVacasLargo(solicitud.horasDisponiblesDespuesCancelacion || 0)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                 
               
                </>
                )}
                {/* Mostrar motivo de cancelación si existe */}
                {solicitud.motivoCancelacion && (
                  <Alert 
                    severity="info" 
                    sx={{ mt: 1, bgcolor:"dorado.fondo", color:"black" }}
                  >
                    <Typography variant="body1">
                      <strong>Motivo de cancelación:</strong><br/> {solicitud.motivoCancelacion}
                    </Typography>
                  </Alert>
                )} 
  
                </Collapse>
              </Grid>
            {/* Acciones*/}
            <Grid size={{xs:12, sm:3, md:2}}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'row', sm: 'column' },
                  justifyContent: { xs: 'space-between', sm: 'flex-end' },
                  alignItems: { xs: 'center', sm: 'center' },
                  height: '100%'
                }}
              >
  
               
                {/* Cancelar Parcialmente - solo si se puede */}
                {puedeCancelarParcialmente && (
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
                            Cancelar Días
                            </Typography>
                        </Button>
                )}
  
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };
  
    const renderSolicitudes = (solicitudes) => {
      if (loading) {
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Cargando solicitudes...
            </Typography>
          </Box>
        );
      }
  
      if (solicitudes.length === 0) {
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No hay solicitudes en esta categoría
            </Typography>
          </Box>
        );
      }
  
      return solicitudesPaginadas.map(solicitud => (

        <SolicitudCard key={solicitud.id} solicitud={solicitud} />
      ));
      
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
        {renderSolicitudes(solicitudesFiltradas)}
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
                 {obtenerDiasDisfrutados(solicitudParaCancelar) > 0 && (
                <Typography variant="body1" color="success.main" textAlign='center'  sx={{ }}>
                   {obtenerDiasDisfrutados(solicitudParaCancelar)}{obtenerDiasDisfrutados(solicitudParaCancelar)==1?" dia disfrutado ":" dias disfrutados "}
                </Typography>
                )}   
                {solicitudParaCancelar.diasCancelados && solicitudParaCancelar.diasCancelados.length > 0 && (
                <Typography variant="body1" color="warning.main" textAlign='center' gutterBottom sx={{ }}>
                   {obtenerDiasCancelados(solicitudParaCancelar).length}{obtenerDiasCancelados(solicitudParaCancelar).length==1?" dia cancelado ":" dias cancelados "}anteriormente
                </Typography>
                )}       
                <SelectorDiasCancelacion
                solicitud={solicitudParaCancelar}
                onDiasSeleccionados={setDiasACancelar}
                diasSeleccionados={diasACancelar}
                esAdmin={true}
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
                helperText="Especifica por qué necesitas cancelar estos días"
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
              {solicitudParaCancelar?.horasSolicitadas<8
                ? <Typography fontSize={'1.1rem'}>
                    {procesandoCancelacion ? 'Procesando...' : `Cancelar ${solicitudParaCancelar.horasSolicitadas} hora${solicitudParaCancelar.horasSolicitadas==1?"":'s'}`}
                  </Typography>
                : <Typography fontSize={'1.1rem'}>
                    {procesandoCancelacion ? 'Procesando...' : `Cancelar ${diasACancelar.length} día${diasACancelar.length==1?"":'s'}`}
                 </Typography>
              }
            </Button>
        </DialogActions>
        </Dialog>

      </Container>
    </>
  );
};

export default HistorialSolicitudes;
