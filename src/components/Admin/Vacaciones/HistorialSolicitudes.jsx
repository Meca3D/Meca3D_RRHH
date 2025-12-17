// components/Admin/Vacaciones/HistorialSolicitudes.jsx - VERSIÓN CORREGIDA
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, FormControl, InputLabel, Select, Menu, MenuList,
  MenuItem, Chip, Alert, Grid, Collapse, Divider, Avatar, Paper,
  CircularProgress, Pagination, InputAdornment, Dialog, DialogTitle, 
  DialogContent, DialogActions, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Euro,
  ArrowBackIosNew,
  MoreVert,
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
  Cancel
} from '@mui/icons-material';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useUIStore } from '../../../stores/uiStore';
import SelectorDiasCancelacion from './SelectorDiasCancelacion';
import { formatearFechaCorta,formatearFechaLarga, ordenarFechas } from '../../../utils/dateUtils';
import { formatearNombre, capitalizeFirstLetter } from '../../Helpers';
import { formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';


const HistorialSolicitudes = () => {
  const navigate = useNavigate();
  const {
    loadHistorialSolicitudes,
    exportarHistorialCSV,
    obtenerDatosUsuarios,
    obtenerDiasCancelados,
    obtenerDiasDisfrutados,
    cancelarDiasSolicitudVacaciones,
    cancelarVentaVacaciones,
    puedeCancelarDias  
  } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudesOriginales, setSolicitudesOriginales] = useState([]);
  const [datosUsuarios, setDatosUsuarios] = useState({});
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [dialogoCancelacion, setDialogoCancelacion] = useState(false);
  const [solicitudACancelar, setSolicitudACancelar] = useState(null);
  const [diasACancelar, setDiasACancelar] = useState([]);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);
  const [estadisticaActivaFiltro, setEstadisticaActivaFiltro] = useState('');
  const [cancelacionesExpanded, setCancelacionesExpanded] = useState({});

  // Estados de filtros
  const [filtros, setFiltros] = useState({
    estado: 'todos',
    empleado: 'todos',
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
        if (filtrosSinBusqueda.empleado === "todos") delete filtrosSinBusqueda.empleado;

        
        const historial = await loadHistorialSolicitudes(filtrosSinBusqueda);

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
                const motivoCancelacion =  (s.cancelaciones?.[s.cancelaciones.length - 1]?.motivoCancelacion ?? "")
    .toLowerCase();
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
    }, [filtros, loadHistorialSolicitudes, obtenerDatosUsuarios]);


  // Empleados disponibles para filtro
  const empleadosDisponibles = useMemo(() => {
    const emails = [...new Set(solicitudes.map((s) => s.solicitante))];

    return emails
      .map((email) => ({
        email,
        nombre: datosUsuarios?.[email]?.nombre ? datosUsuarios[email].nombre : email,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  }, [solicitudes, datosUsuarios]);


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
    for (let i = añoActual+1; i >= añoActual - 5; i--) {
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
      case 'cancelado': return 'dorado';
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

    const handleAbrirCancelacion = (solicitud) => {
      setSolicitudACancelar(solicitud);
      setDiasACancelar([]);
      setMotivoCancelacion('');
      setDialogoCancelacion(true);
    };

   const handleConfirmarCancelacion = async () => {
  if (!motivoCancelacion.trim()) {
    showError('Debes especificar un motivo para la cancelación');
    return;
  }

  // Si es solicitud de venta
  if (solicitudACancelar.esVenta) {
    try {
      setProcesandoCancelacion(true);
      await cancelarVentaVacaciones(solicitudACancelar, motivoCancelacion, true);
      showSuccess('Venta cancelada correctamente');
      setDialogoCancelacion(false);
      setSolicitudACancelar(null);
      setMotivoCancelacion('');
      
      // Recargar historial
      const historial = await loadHistorialSolicitudes(filtros);
      setSolicitudes(historial);
    } catch (error) {
      showError('Error al cancelar la venta: ' + error.message);
    } finally {
      setProcesandoCancelacion(false);
    }
    return;
  }

  // Cancelación de días de vacaciones
  if (diasACancelar.length === 0) {
    showError('Debes seleccionar al menos un día para cancelar');
    return;
  }

  try {
    setProcesandoCancelacion(true);
    const resultado = await cancelarDiasSolicitudVacaciones(
      solicitudACancelar,
      diasACancelar,
      motivoCancelacion,
      true // es admin
    );

    showSuccess(
      resultado.esCancelacionTotal
        ? 'Solicitud cancelada completamente'
        : `Cancelación procesada correctamente (${diasACancelar.length} día${diasACancelar.length > 1 ? 's' : ''})`
    );

    setDialogoCancelacion(false);
    setSolicitudACancelar(null);
    setDiasACancelar([]);
    setMotivoCancelacion('');

    // Recargar historial
    const historial = await loadHistorialSolicitudes(filtros);
    setSolicitudes(historial);
  } catch (error) {
    showError(`Error en cancelación: ${error.message}`);
  } finally {
    setProcesandoCancelacion(false);
  }
};


    const puedeGestionarSolicitud = (solicitud) => {
      // Usar la función del store para determinar si se puede cancelar
      const puedeCancelar = puedeCancelarDias(solicitud, true); // true = esAdmin
      
      const diasDisfrutados = obtenerDiasDisfrutados(solicitud);
      const diasDisponibles = (solicitud.fechasActuales || []).filter(fecha => {
        const yaDisfrutado = diasDisfrutados.includes(fecha);
        return !yaDisfrutado;
      });

      const esHorasSueltas = solicitud.horasSolicitadas < 8 && solicitud.fechasActuales?.length === 1;

      return {
        puedeCancelar,
        diasDisponibles,
        esHorasSueltas
      };
    };


    const SolicitudCard = ({ solicitud }) => {
      const { puedeCancelar, diasDisponibles } = puedeGestionarSolicitud(solicitud);
      const colorEstado = getColorEstado(solicitud.estado);
      const cancelaciones = solicitud.cancelaciones || [];
      const diasDisfrutados = obtenerDiasDisfrutados(solicitud);
      const diasCancelados = obtenerDiasCancelados(solicitud.cancelaciones);
      const tieneCancelaciones = cancelaciones.length > 0;
      const userData = datosUsuarios[solicitud.solicitante] || {};
      const esExpandida = solicitudesExpanded[solicitud.id];
      const menuButtonRef = React.useRef(null);
      const [menuOpen, setMenuOpen] = useState(false);
      const handleAbrirMenu = (event) => {
        event.stopPropagation();
        setMenuOpen(true);
      };
  
      const handleCerrarMenu = () => {
        setMenuOpen(false);
      };
  
      return (
        <Card sx={{ mb: 2, borderLeft: `4px solid ${colorEstado}.main` }}>
          <CardContent sx={{mb:-2}}>
          <Grid container spacing={2} alignItems="center">
          <Box 
            sx={{ 
              width:'100%',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <Typography fontSize='1.5rem' fontWeight={600}>
              {formatearNombre(userData.nombre)}
            </Typography>            
            <Chip
              label={formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
              sx={{fontSize:'1rem', fontWeight:'bold'}}
              variant="outlined"
            />
             <Box sx={{flex:0}}>
              {/* Menú de 3 puntos (solo si hay acciones disponibles) */}
              {(puedeCancelar) && (
                <>
                <IconButton
                  size="small"
                  ref={menuButtonRef}
                  onClick={handleAbrirMenu}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      color: 'primary.main'
                    }
                  }}
                >
                  <MoreVert />
                </IconButton>
                  {/* Menú de acciones */}
                <Menu
                  disablePortal
                  keepMounted 
                  anchorEl={menuButtonRef.current}
                  open={menuOpen}
                  onClose={handleCerrarMenu}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',  
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  slotProps={{
                    paper: {
                      sx:{
                      minWidth: 180,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      borderRadius: 2 
                      }        
                    }
                  }}
                >
              {puedeCancelar && (
                <MenuItem onClick={() => handleAbrirCancelacion(solicitud)}>
                  <ListItemIcon>
                    <Cancel fontSize="small" sx={{ color: 'warning.main' }} />
                  </ListItemIcon>
                  <ListItemText primary={solicitud.esVenta?"Cancelar Venta":"Cancelar días"} />
                </MenuItem>
              )}
            </Menu>
              </>
              )}
            </Box>
            </Box>
              <Grid size={{xs:12, md:6}}>
                <Box sx={{width:'100%', display: 'flex', justifyContent:"space-between", alignItems: 'center' }}>
                  <Box sx={{minWidth: 0}} flex={1}>
                  {solicitud.esVenta && (
                    <Box sx={{display:'flex', alignItems:'center', color:"verde.main"}}>
                    <Typography variant="body1"  textAlign="center" fontWeight={600} sx={{ }}>
                      💵 Venta de Vacaciones
                    </Typography>
                    </Box>                 
                    )}
                  <Typography variant="body1" fontWeight={600} sx={{color:"azul.main"}} >
                    Solicitada: {formatearFechaCorta(solicitud.fechaSolicitud)}
                  </Typography>
                  {solicitud.estado==="cancelado" && (
                    <Typography variant="body1" fontWeight={600} sx={{color:"dorado.main"}}>
                    Cancelada: {formatearFechaCorta(solicitud.cancelaciones[cancelaciones.length-1].fechaCancelacion)}
                    </Typography>
                  )}
                    {solicitud.estado === 'aprobada' && (
                    <Typography variant="body1" fontWeight={600} sx={{color:"verde.main"}}>
                    Aprobada: {formatearFechaCorta(solicitud.fechaAprobacionDenegacion)}
                    </Typography>
                  )}
                  {solicitud.estado === 'denegada' && (
                    <Typography variant="body1" fontWeight={600} sx={{color:"rojo.main"}}>
                    Denegada: {formatearFechaCorta(solicitud.fechaAprobacionDenegacion)}
                    </Typography>
                  )}

                    {tieneCancelaciones && (
              
                    <Typography variant="body1" fontWeight={600} sx={{color:"naranja.main"}}>
                      {cancelaciones.length} Cancelación{cancelaciones.length > 1 ? 'es' : ''}
                    </Typography>
                      
                    )}
                  </Box>
                    <Box sx={{flex:0}} >
                    <Chip
                      label={solicitud.estado=='cancelado'?"CANCELADA": solicitud.estado.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor:`${colorEstado}.main`,
                        color: `white`,
                        fontWeight: 600,
                        height: 20, 
                        '& .MuiChip-label': {
                          fontSize: '0.85rem', 
                          px:0.5
                        },
                      }}
                    />
                  </Box>
                </Box>
                  <Box
                    onClick={() => handleToggleExpanded(solicitud.id)}
                    sx={{
                      width:'100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:'space-between',
                      cursor: 'pointer',         
                    }}
                  >
                  {solicitud?.esAjusteSaldo 
                    ? <Grid size={{ xs: 12 }}>
                    <Typography  sx={{ fontWeight: 600, fontSize:'1rem', mt:3}}>
                      Ajuste de saldo             
                      </Typography>
                      <Typography  sx={{ fontWeight: 600, fontSize:'1rem', color: 
                        solicitud.tipoAjuste=="reducir"?"rojo.main":solicitud.tipoAjuste=="añadir"?"verde.main":"azul.main" }}>
                      {capitalizeFirstLetter(solicitud.tipoAjuste)} {formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                      </Typography>
                    </Grid>
                    : solicitud.esVenta ? (
                      <Grid size={{ xs: 12 }}>
                      <Typography  sx={{ fontWeight: 600, fontSize:'1rem', mt:1 }}>
                        Venta de Vacaciones: {formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                      </Typography>
                      </Grid>
                    ):(
                      <Grid size={{ xs: 12 }}>
                          <Typography  sx={{ fontWeight: 600, fontSize:'1rem', mt:1 }}>
                        ✅ Días Solicitados: {formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                          </Typography>
                      </Grid>
                      )}    
                      {esExpandida ? <ExpandLess sx={{fontSize:'2rem'}}/> : <ExpandMore sx={{fontSize:'2rem'}}/>}      
                      </Box>
                        <Collapse in={esExpandida}>
                      {/*  Mostrar saldos en solicitudes aprobadas */}
                        {solicitud.horasDisponiblesAntes !== undefined && solicitud.horasDisponiblesAntes !=solicitud.horasDisponiblesDespues && (
                        <Box sx={{mt:0.5, p:1, bgcolor: '#fafafa', border:'2px solid', borderRadius:2, borderColor: solicitud.esAjusteSaldo 
                          ? solicitud.tipoAjuste=="reducir"?"rojo.main":solicitud.tipoAjuste=="añadir"?"verde.main":"azul.main"
                          : 'verde.main'
                            }}>
                          <Typography variant="h6" textAlign="center">
                            Saldo al aprobarse {solicitud?.esAjusteSaldo?'el ajuste':'la solicitud'}
                          </Typography>
                          <Divider  sx={{bgcolor:'black', mt:0}} />
                          <Grid container sx={{ mt: 0.5 }}>
                            <Grid size={{ xs: 12 }}>
                              <Box display='flex' justifyContent='space-between'>
                              <Typography variant="h6" display="block">
                                Antes:
                              </Typography>
                              <Typography variant="h6" display="block">
                               {formatearTiempoVacasLargo(solicitud.horasDisponiblesAntes)}
                              </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <Box display='flex' justifyContent='space-between'>
                              <Typography variant="h6" display="block">
                                Después: 
                              </Typography>
                              <Typography variant="h6" display="block">
                               {formatearTiempoVacasLargo(solicitud.horasDisponiblesDespues || 0)}
                              </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                      
        
                  {/*  Lista de fechas con estados visuales */}
                  {!solicitud?.esAjusteSaldo && !solicitud.esVenta && (
                    <>
                  {(solicitud.fechas.length === 1) ? (
                    <Grid size={{ xs: 12 }}>
                    <Box  justifyContent='space-around' alignItems={'center'} 
                        sx={{
                          mt:1,
                          display: 'flex',
                          width:'100%',
                          alignItems: 'center',
                          cursor: 'pointer',
                          p: 1,
                          border:'2px solid',
                          borderColor: `${colorEstado}.main`,
                          borderRadius: 3,
                    }}>
                    <Typography fontSize={'1.15rem'} 
                      sx={{textDecoration:solicitud.fechasActuales.length===0?'line-through':'none',
                        color:solicitud.fechasActuales.length===0?'error.main':''
                        }}>
                      {solicitud.fechasActuales.length===0?'❌ ':''}{formatearFechaLarga(solicitud.fechas[0])}
                    </Typography>
                    {solicitud.horasSolicitadas<8 && (
                      <Chip
                        label ={formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
                        size="small"
                              sx={{ 
                                py:0.5,               
                                bgcolor:  'azul.main', 
                                color: 'white', 
                                fontWeight: 700,
                              }}
                            />
                    )}
                    </Box>
                    </Grid>
                  ) : (
                    <Grid size={{ xs: 12 }}>        
                      <Box
                        sx={{
                          width:'100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent:'center',
                          cursor: 'pointer',
                          p: 0.5,
                          mt:2,
                          border:'2px solid',
                          borderColor: `${colorEstado}.main`,
                          borderRadius: 3,          
                        }}
                      >
                        <Typography fontSize={'1.15rem'}>
                          Fechas solicitadas ({solicitud.fechas.length})
                        </Typography>
                      </Box>
                        <Grid container sx={{mt:0}} spacing={0.5}>
                          {ordenarFechas(solicitud.fechas).map(fecha => {
                            const estaCancelado = diasCancelados.includes(fecha);
                            const estaDisfrutado = diasDisfrutados.includes(fecha);
                            // Determinar estilo y etiqueta según el estado REAL
                            let colorTexto = 'text.primary'
                            let etiqueta = '';
                            let decoracion = 'none';
                            let icono = '•';
                            if (estaCancelado) {
                              // Fecha cancelada
                              colorTexto = 'error.main';
                              decoracion = 'line-through';
                              etiqueta = '(Cancelado)';
                              icono = '❌';
                            } 
                            if (estaDisfrutado) {
                              // Fecha disfrutada
                              colorTexto = 'text.secondary';
                              decoracion = 'none';
                              etiqueta = '(Disfrutado)';
                              icono = '✅';
                            }
                            return (
                              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={fecha}>
                                <Box display="flex" justifyContent='center' alignItems="center" gap={0.5}>
                                  <Typography variant="body1"color={colorTexto}>
                                    {icono} 
                                  </Typography>
                                  
                                  <Typography
                                    variant="body1"
                                    color={colorTexto}
                                    sx={{ 
                                      textDecoration: decoracion,
                                      fontStyle: estaDisfrutado? 'italic': 'normal',
                                      fontWeight: 500
                                    }}
                                  >
                                    {formatearFechaCorta(fecha)}
                                  </Typography>
                                  {etiqueta && (
                                    <Typography 
                                      variant="caption" 
                                      color={colorTexto}
                                      sx={{ fontStyle: 'italic' }}
                                    >
                                      
                                    </Typography>
                                  )}
                                  </Box>
                              </Grid>
                            )
                          })}
                        </Grid>
           
                    </Grid>
                  )}
                  </>
                  )}
                  
                  {solicitud.comentariosSolicitante && (
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ p: 1.5, mt:2, bgcolor: '#f1f1f1', borderRadius: 2, borderLeft: `4px solid ${solicitud.esAjusteSaldo
                        ?
                        solicitud.tipoAjuste === 'añadir' ? 'green' : 
                        solicitud.tipoAjuste === 'reducir' ? 'red' : 'blue'
                        
                        :
                        solicitud.estado === 'aprobada' ? 'green' : 
                        solicitud.estado === 'cancelado' ? 'brown' : 'red'}` }}>
                          <Typography variant="body1" display="block" fontWeight={600}>
                            💬 Comentarios Solicitante:
                          </Typography>
                          <Typography variant="body1" fontStyle='italic'>
                            "{solicitud.comentariosSolicitante}"
                          </Typography>
                        </Box>
                      </Grid>
                  )}
        
                {solicitud.comentariosAdmin && (
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ p: 1.5, mt:1,  bgcolor: '#e3f2fd', borderRadius: 2, borderLeft: '4px solid #2196F3' }}>
                        <Typography variant="body1" display="block" fontWeight={600}>
                          👨‍💼 Respuesta de administración:
                        </Typography>
                        <Typography variant="body1" fontStyle='italic' sx={{ whiteSpace: 'pre-wrap' }}>
                          "{solicitud.comentariosAdmin}"
                        </Typography>
                      </Box>
                    </Grid>
                  )}
        
                  {/* Acordeón de cancelaciones */}
                  {tieneCancelaciones && (
                      <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 2, bgcolor: 'black' }} />
                        {solicitud.esVenta
                        ?<Typography sx={{ mb: 1, fontWeight: 600, fontSize: '1.1rem' }}>
                          ❌ Venta Cancelada: {formatearTiempoVacasLargo(cancelaciones[0].horasDevueltas)}
                        </Typography>
                        :<Typography sx={{ mb: 1, fontWeight: 600, fontSize: '1.1rem' }}>
                          ❌ Días Cancelados: {diasCancelados.length === 1 ? formatearTiempoVacasLargo(cancelaciones[0].horasDevueltas) : `${diasCancelados.length} dias`}
                        </Typography>
                        }
        
                        <Box
                          onClick={() => toggleCancelacionesExpanded(solicitud.id)}
                          sx={{
                            mb:1,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            bgcolor:'warning.lighter',
                            borderRadius: 3,
                            border: '2px solid',
                            borderColor: 'warning.main',
                            '&:hover': { bgcolor: 'warning.light' }
                          }}
                        >
                          <Typography variant="body1" fontWeight={600} color="warning.dark">
                            {cancelaciones.length} {cancelaciones.length !== 1 ? ' Cancelaciones' : ' Cancelación'}
                          </Typography>
                          {cancelacionesExpanded[solicitud.id] ? <ExpandLess /> : <ExpandMore />}
                        </Box>
        
                        <Collapse in={cancelacionesExpanded[solicitud.id]}>
                          <Box sx={{ mt: 1 }}>
                            {cancelaciones.map((cancelacion, index) => (
                              <Card
                                key={index}
                                elevation={0}
                                sx={{
                                  p: 2,
                                  mb: 2.5,
                                  bgcolor:  cancelacion.esCancelacionTotal?'rojo.fondo':'naranja.fondo',
                                  borderLeft: '4px solid',
                                  borderColor: cancelacion.esCancelacionTotal?'error.main':'warning.main'
                                }}
                              >
                                <Box display='flex' justifyContent='space-between'>
                                <Typography variant="body2" fontWeight={700} sx={{ mb: 2, color: cancelacion.esCancelacionTotal?'error.dark':'warning.dark' }}>
                                  Cancelación #{index + 1}
                                  </Typography>
                                    {cancelacion.esCancelacionTotal && (
                                      <Chip 
                                        label="TOTAL" 
                                        size="small" 
                                        sx={{ 
                                          ml: 1, 
                                          bgcolor: 'error.main', 
                                          color: 'white',
                                          fontWeight: 700
                                        }} 
                                      />
                                    )}
                                </Box>
        
                                {/* Fecha de cancelación */}
                                <Box display="flex" justifyContent='space-between' alignItems="center"  mb={1.5}>
                                  <Typography variant="body1" color="">
                                    Cancelado el:
                                  </Typography>
                                  <Typography variant="body1" fontWeight={600}>
                                    {formatearFechaCorta(cancelacion.fechaCancelacion)}
                                  </Typography>                       
                                </Box>
        
                                {/* Días cancelados */}
                                <Box mb={1.5}>
                                  {cancelacion.fechasCanceladas?.length === 1? (
                                    <>
                                    <Typography  sx={{textAlign:'center', fontSize:'1rem'}}>
                                      Día Cancelado 
                                    </Typography>  
                                    <Box  sx={{
                                          display: 'flex',
                                          justifyContent:cancelacion.horasDevueltas<8?'space-between':'center',
                                          alignItems: 'center',
                                          cursor: 'pointer',
                                          p: 1,   
                                          border:'1px solid',
                                          bgcolor:'white',
                                          borderColor: cancelacion.esCancelacionTotal?'error.main':'warning.main',
                                          borderRadius: 2,
                                    }}>
                                <Typography fontSize={'1.05rem'} sx={{fontWeight: 600}} >
                                  {formatearFechaLarga(cancelacion.fechasCanceladas[0])}
                                </Typography>
                                {cancelacion.horasDevueltas<8 && (
                                  <Chip
                                    label ={formatearTiempoVacasLargo(cancelacion.horasDevueltas)}
                                    size="small"
                                          sx={{ 
                                            py:0.5,                             
                                            bgcolor: 'error.main',
                                            color: 'white',
                                            fontWeight: 600
                                          }}
                                        />
                                )}
                                </Box>
                                </>
                                ) : (
                                <>
                                  <Typography variant="body1" textAlign={'center'} display="block" mb={0.5}>
                                    Días cancelados ({cancelacion.fechasCanceladas.length})
                                  </Typography>                       
                                  < Grid container sx={{ display: 'flex' }}>
                                    {cancelacion.fechasCanceladas.map(fecha => (
                                      <Grid size={{xs:6,md:4}} key={fecha}>
                                      <Box sx={{textAlign:'center'}}>
                                      <Chip                             
                                        label={formatearFechaCorta(fecha)}
                                        size="small"
                                        variant='outlined'
                                        sx={{
                                          p:0.75,
                                          fontSize: '1rem',
                                          mb: 0.5,
                                          bgcolor: 'white',
                                          color: cancelacion.esCancelacionTotal?'error.main':'warning.main',
                                          borderColor: cancelacion.esCancelacionTotal?'error.main':'warning.main',
                                          fontWeight: 600
                                        }}
                                      />
                                      </Box>
                                      </Grid>
                                    ))}
                                  </Grid>
                                  </>
                                )}
                                </Box>
                                <Box sx={{ p:1, bgcolor: 'white', border:'1px solid', borderRadius:2, borderColor: cancelacion.esCancelacionTotal?'error.main':'warning.main'}} >
                                <Box display="flex" justifyContent='space-between' alignItems="center" mb={0}>
                                <Typography variant="body1" display="block">
                                  Vacaciones Devueltas:
                                </Typography>
                                <Typography variant="body1" display="block" fontWeight={600}>
                                  {formatearTiempoVacasLargo(cancelacion.horasDevueltas)}
                                </Typography>
                                </Box>
                                <Divider sx={{bgcolor:'black', mb:0.5}} />
                                  <Box display="flex" justifyContent='space-between' alignItems="center"  mb={0.5}>
                                  <Typography variant="body1" displaybody2="block" >
                                    Saldo antes:
                                  </Typography>
                                  <Typography variant="body1" display="block" fontWeight={600} >
                                    {formatearTiempoVacasLargo(cancelacion.horasDisponiblesAntesCancelacion || 0)}
                                  </Typography>
                                </Box>
                                <Box display="flex" justifyContent='space-between' alignItems="center" mb={0.5}>
                                  <Typography variant="body1" display="block" >
                                    Saldo después:
                                  </Typography>
                                  <Typography variant="body1" display="block" fontWeight={600}>
                                    {formatearTiempoVacasLargo(cancelacion.horasDisponiblesDespuesCancelacion || 0)}
                                  </Typography>
                                  </Box>
                                  </Box>
                                {/* Motivo */}
                                <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: cancelacion.esCancelacionTotal?'error.main':'warning.main' }}>
                                  <Typography variant="body2" color="" fontWeight={600} display="block" mb={0.5}>
                                    💬 Motivo:
                                  </Typography>
                                  <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                                    "{cancelacion.motivoCancelacion}"
                                  </Typography>
                                </Box>
        
                                {/* Quién canceló */}
                                <Box display="flex" justifyContent='space-between' alignItems="center" mt={0.5}>
                                  <Typography variant="body2" color="">
                                    Cancelado por:
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600} color="">
                                    {cancelacion.procesadaPor}
                                  </Typography>
                                </Box>
                              </Card>
                            ))}
                          </Box>
                        </Collapse>
                      </Grid>
                  )}
                  </Collapse>
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
              <Typography variant="h4" fontWeight={600} color="dorado.main">
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
                      <MenuItem value="todos">Todos los empleados</MenuItem>
                      {empleadosDisponibles.map(({email,nombre}) => (
                        <MenuItem key={email} value={email}>
                          {nombre}
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

      {/* Diálogo Unificado de Cancelación */}
      <Dialog 
        open={dialogoCancelacion} 
        onClose={() => !procesandoCancelacion && setDialogoCancelacion(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle display='flex' justifyContent='center' bgcolor='error.main' color='white'>
          {solicitudACancelar?.esVenta 
            ? 'Cancelar Venta de Vacaciones'
            : 'Cancelar Vacaciones'}
        </DialogTitle>
        
        <DialogContent>
          {solicitudACancelar && (
            <>
              {/* Info del empleado */}
              <Alert severity="info" sx={{ my: 2 }}>
                <Typography variant="body1" sx={{ textAlign:'center', fontWeight: 600 }}>
                  {datosUsuarios[solicitudACancelar.solicitante]?.nombre || solicitudACancelar.solicitante}
                </Typography>
                <Typography variant="body2">
                  Solicitud original: {formatearTiempoVacasLargo(solicitudACancelar.horasSolicitadas)}
                </Typography>
              </Alert>

              {/* Información adicional */}
              {solicitudACancelar.esVenta ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Se cancelará la venta de vacaciones y se devolverán las horas al saldo del empleado.
                </Alert>
              ) : (
                <>
                  {/* Días disfrutados/cancelados */}
                  <Box display='flex' justifyContent='space-between'>
                  {obtenerDiasDisfrutados(solicitudACancelar).length > 0 && (
                    <Chip
                      label={(obtenerDiasDisfrutados(solicitudACancelar).length === 1 && solicitudACancelar.horasSolicitadas<8)
                        ? `${formatearTiempoVacasLargo(solicitudACancelar.horasSolicitadas)} ya disfrutada${solicitudACancelar.horasSolicitadas===1?'':'s'}`
                        : `${obtenerDiasDisfrutados(solicitudACancelar).length} día${obtenerDiasDisfrutados(solicitudACancelar).length === 1 ? '' : 's'} ya disfrutado${obtenerDiasDisfrutados(solicitudACancelar).length === 1 ? '' : 's'}`}
                      size="small"
                      color="success"
                      sx={{ mr: 1, mb: 2 }}
                    />
                  )}
                  
                  {solicitudACancelar.cancelaciones?.length > 0 && (
                    <Chip
                      label={`${obtenerDiasCancelados(solicitudACancelar.cancelaciones).length} día${obtenerDiasCancelados(solicitudACancelar.cancelaciones).length === 1 ? '' : 's'} ya cancelado${obtenerDiasCancelados(solicitudACancelar.cancelaciones).length === 1 ? '' : 's'}`}
                      size="small"
                      color="error"
                      sx={{ mb: 2 }}
                    />
                  )}
                  </Box>
                  {/* Selector de días */}
                  <Box sx={{ mb: 3 }}>
                    <SelectorDiasCancelacion
                      solicitud={solicitudACancelar}
                      onDiasSeleccionados={setDiasACancelar}
                      diasSeleccionados={diasACancelar}
                      esAdmin={true}  // ✅ Admin puede cancelar cualquier día
                    />
                  </Box>
                </>
              )}

              {/* Campo de motivo */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Motivo de la cancelación"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Explica brevemente el motivo de la cancelación..."
                disabled={procesandoCancelacion}
                required
                error={!motivoCancelacion.trim()}
                helperText={!motivoCancelacion.trim() ? 'El motivo es obligatorio' : ''}
              />
            </>
          )}
        </DialogContent>

        <DialogActions sx={{display:'flex', justifyContent:'space-between'}}>
          <Button 
            onClick={() => setDialogoCancelacion(false)} 
            disabled={procesandoCancelacion}
            variant='outlined'
            sx={{
              fontSize:'1.1rem',
              px:2,
              py:1
            }}
          >
            Volver
          </Button>
          <Button
            onClick={handleConfirmarCancelacion}
            variant="contained"
            color="error"
            disabled={procesandoCancelacion || !motivoCancelacion.trim()||(!solicitudACancelar?.esVenta && diasACancelar.length===0)}
            startIcon={procesandoCancelacion && <CircularProgress size={20} />}
            sx={{
              fontSize:'1.1rem',
              px:2,
              py:1
            }}
          >
            {procesandoCancelacion 
              ? 'Procesando...' 
              : solicitudACancelar?.esVenta ? 'Cancelar Venta':'Cancelar Días'}
          </Button>
        </DialogActions>
      </Dialog>


      </Container>
    </>
  );
};

export default HistorialSolicitudes;
