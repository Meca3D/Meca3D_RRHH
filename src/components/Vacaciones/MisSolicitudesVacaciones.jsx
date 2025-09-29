// components/Vacaciones/MisSolicitudesVacaciones.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar, Paper,
  IconButton, Chip, Grid, Tabs, Tab, Fab, Alert, Dialog, Collapse, Divider,
  DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress
} from '@mui/material';
import {
  CalendarMonthOutlined as CalendarMonthOutlinedIcon,
  ArrowBackIosNew as ArrowBackIcon,
  EventBusyOutlined as EventBusyOutlinedIcon,
  HistoryOutlined as HistoryIcon,
  Add as AddIcon,
  EditOutlined as EditIcon,
  CancelOutlined as CancelIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearTiempoVacasLargo, formatearTiempoVacas } from '../../utils/vacacionesUtils';
import { formatearFechaCorta, ordenarFechas, esFechaPasadaOHoy, formatearFechaLarga } from '../../utils/dateUtils';
import SelectorDiasCancelacion from '../Admin/Vacaciones/SelectorDiasCancelacion';
import { capitalizeFirstLetter } from '../Helpers';

const MisSolicitudesVacaciones = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    loadSolicitudesConCancelaciones, 
    cancelarSolicitudVacaciones,
    eliminarSolicitudVacaciones,
    cancelarSolicitudParcial,
    obtenerDiasCancelados,      
    obtenerDiasDisfrutados,      
    loading 
  } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();
  const [solicitudesVacaciones, setSolicitudesVacaciones] = useState([]);

  // Estados principales
  const [tabActual, setTabActual] = useState(0);
  const [solicitudExpandida, setSolicitudExpandida] = useState(null);
  const [cancelacionExpandida, setCancelacionExpandida] = useState(null);
  // Estado para Acordeon de Cancelaciones Parciales
  const [cancelacionesExpanded, setCancelacionesExpanded] = useState({});
  
  // Estados para cancelación
  const [dialogoCancelacion, setDialogoCancelacion] = useState(false);
  const [solicitudACancelar, setSolicitudACancelar] = useState(null);
  const [horasDisponiblesParaCancelar, setHorasDisponiblesParaCancelar] = useState([]);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // Estados para cancelación parcial
  const [dialogoCancelacionParcial, setDialogoCancelacionParcial] = useState(false);
  const [solicitudParaCancelarParcial, setSolicitudParaCancelarParcial] = useState(null);
  const [diasACancelar, setDiasACancelar] = useState([]);
  const [motivoCancelacionParcial, setMotivoCancelacionParcial] = useState('');
  const [procesandoCancelacionParcial, setProcesandoCancelacionParcial] = useState(false);

 useEffect(() => {
    const cargarSolicitudes = async () => {
      try {
        const solicitudes = await loadSolicitudesConCancelaciones(user?.email);
        setSolicitudesVacaciones(solicitudes);
      } catch (error) {
        showError('Error cargando solicitudes: ' + error.message);
      }
    };

    if (user?.email) {
      cargarSolicitudes();
    }
  }, [user?.email, loadSolicitudesConCancelaciones]);

  
 
  const puedeGestionarSolicitud = (solicitud) => {
    const diasCancelados = obtenerDiasCancelados(solicitud.cancelacionesParciales || []);
    const diasDisfrutados = obtenerDiasDisfrutados(solicitud);
    const diasDisponibles = solicitud.fechas.filter(fecha => {
      const yaFueCancelado = diasCancelados.includes(fecha);
      const esFechaPasada = esFechaPasadaOHoy(fecha);
      const yaDisfrutado = diasDisfrutados.includes(fecha)
      return !yaFueCancelado && !esFechaPasada && !yaDisfrutado
    });
    const esHorasSueltas = solicitud.horasSolicitadas < 8 && solicitud.fechas.length === 1;
    return {
      puedeEditar: (solicitud.estado === 'pendiente'||solicitud.estado==="aprobada") && diasDisponibles.length === solicitud.fechas.length && !solicitud.esAjusteSaldo,
      puedeCancelar: (solicitud.estado === 'pendiente' || solicitud.estado === 'aprobada') 
                     && diasDisponibles.length > 0 
                     && !solicitud.esAjusteSaldo,
      puedeCancelarParcialmente: solicitud.estado === 'aprobada' 
                                && !esHorasSueltas 
                                && diasDisponibles.length > 1,
      horasDisponibles:esHorasSueltas ? solicitud.horasSolicitadas : diasDisponibles,
      esHorasSueltas
    };
  };

  // Filtrar solicitudes por estado
  const solicitudesPendientes = solicitudesVacaciones.filter(s => s.estado === 'pendiente');
  const solicitudesAprobadas = solicitudesVacaciones.filter(s => s.estado === 'aprobada');
  const solicitudesDenegadas = solicitudesVacaciones.filter(s => s.estado === 'denegada');
  const solicitudesCanceladas = solicitudesVacaciones.filter(s => s.estado === 'cancelado');


  // Función para abrir diálogo de cancelación
  const handleAbrirCancelacion = (solicitud) => {
    setSolicitudACancelar(solicitud);
    const { horasDisponibles, esHorasSueltas } = puedeGestionarSolicitud(solicitud);
    setHorasDisponiblesParaCancelar(esHorasSueltas?horasDisponibles:horasDisponibles.length*8)
    setMotivoCancelacion('');
    setDialogoCancelacion(true);
  };

  // Función para confirmar cancelación
  const handleConfirmarCancelacion = async () => {
    if (solicitudACancelar?.estado==='aprobada' && !motivoCancelacion.trim()) {
      showError('Debes escribir un motivo para cancelar la solicitud');
      return;
    }

    setCancelando(true);
    try {
    if (solicitudACancelar.estado === "pendiente") {
      await eliminarSolicitudVacaciones(
        solicitudACancelar.id, 
        solicitudACancelar.horasSolicitadas, 
        solicitudACancelar.solicitante  
      )
    } else {
      await cancelarSolicitudVacaciones(solicitudACancelar, motivoCancelacion);
    }
      
      const tipoTexto = solicitudACancelar.estado === 'pendiente' ? 'eliminada' : 'cancelada';
      showSuccess(`Solicitud ${tipoTexto} correctamente`);
      
      setDialogoCancelacion(false);
      setSolicitudACancelar(null);
      setMotivoCancelacion('');
      
      //  RECARGAR solicitudes
      const solicitudes = await loadSolicitudesConCancelaciones(user?.email);
      setSolicitudesVacaciones(solicitudes);
      
    } catch (error) {
      showError(`Error al ${solicitudACancelar.estado==="aprobada"?'cancelar':'eliminar'} la solicitud: ` + error.message);
    } finally {
      setCancelando(false);
    }
  };


  const handleAbrirCancelacionParcial = (solicitud) => {
    setSolicitudParaCancelarParcial(solicitud);
    setDiasACancelar([]);
    setMotivoCancelacionParcial('');
    setDialogoCancelacionParcial(true);
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

    if (diasACancelar.length >= solicitudParaCancelarParcial.fechas.length) {
      showError('No puedes cancelar todos los días. Para eso usa cancelación completa');
      return;
    }

    try {
      setProcesandoCancelacionParcial(true);
      
      // ✅ USAR nueva función
      const resultado = await cancelarSolicitudParcial(
        solicitudParaCancelarParcial,
        diasACancelar,
        motivoCancelacionParcial,
        false // esAdmin = false para usuarios normales
      );
      
      showSuccess(
        `Cancelación parcial procesada correctamente. (${resultado.diasCancelados} días devueltos)`
      );
      
      const solicitudes = await loadSolicitudesConCancelaciones(user?.email)
      setSolicitudesVacaciones(solicitudes)
      setDialogoCancelacionParcial(false);
      setSolicitudParaCancelarParcial(null);
      setDiasACancelar([]);
      setMotivoCancelacionParcial('');
      
      
    } catch (error) {
      showError(`Error en cancelación parcial: ${error.message}`);
    } finally {
      setProcesandoCancelacionParcial(false);
    }
  };

  const handleEditarSolicitud = (solicitud) => {
    // Verificar si se puede editar (solo pendientes y fechas futuras)
    const primeraFecha = solicitud.fechas[0];
    const esFechaFutura = !esFechaPasadaOHoy(primeraFecha);

    if (!esFechaFutura) {
      showError('No puedes editar solicitudes con fechas pasadas');
      return;
    }

    navigate(`/vacaciones/editar/${solicitud.id}`);
  };

  //  Toggle para acordeón de cancelaciones parciales  
  const toggleCancelacionesExpanded = (solicitudId) => {
    setCancelacionesExpanded(prev => ({
      ...prev,
      [solicitudId]: !prev[solicitudId]
    }));
  };


  const getColorEstado = (estado) => {
    switch (estado) {
      case 'pendiente': return { fondo:'azul', color: 'white', bgcolor: 'azul.main' };
      case 'aprobada': return { fondo:'verde', color: 'white', bgcolor: 'verde.main' };
      case 'denegada': return { fondo:'rojo', color: 'white', bgcolor: 'rojo.main' };
      case 'cancelado': return { fondo:'dorado', color: 'white', bgcolor: 'dorado.main' };
      default: return { fondo:'grey', color: 'text.secondary', bgcolor: 'grey.100' };
    }
  };

  const SolicitudCard = ({ solicitud }) => {
    const { puedeEditar, puedeCancelar, puedeCancelarParcialmente, horasDisponibles } = puedeGestionarSolicitud(solicitud);
    const colorEstado = getColorEstado(solicitud.estado);
    const diasCancelados = solicitud.fechasCanceladas || []
    const diasDisfrutados = obtenerDiasDisfrutados(solicitud);
    const cancelacionesParciales = solicitud.cancelacionesParciales || [];
    const diasCanceladosParcialmente=obtenerDiasCancelados(cancelacionesParciales)
    const tieneCancelacionesParciales = cancelacionesParciales.length > 0;
    

    return (
      <Card sx={{ mb: 3, borderLeft: `4px solid ${colorEstado.color}` }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{xs:12, md:6}}>
              <Box sx={{ display: 'flex', justifyContent:"space-between", alignItems: 'center', gap: 1 }}>
                <Box sx={{flex:1}} >
                  <Chip
                    label={solicitud.estado=='cancelado'?"CANCELADA": solicitud.estado.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor: colorEstado.bgcolor,
                      color: colorEstado.color,
                      fontWeight: 600
                    }}
                  />
                  {solicitud.fechaEdicion && (
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
                <Box sx={{ mt: 1, bgcolor: solicitud.esAjusteSaldo 
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
                  bgcolor: `verde.fondo`,
                  borderRadius: 1,
                  '&:hover': { bgcolor: `verde.fondoFuerte` }
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
                  bgcolor: `${colorEstado.fondo}.fondo`,
                  borderRadius: 1,
                  '&:hover': { bgcolor: `${colorEstado.fondo}.fondoFuerte` },
                  
                }}
              >
                <Typography variant="h6">
                  Fechas de la solicitud
                </Typography>
                {solicitudExpandida === solicitud.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
                {cancelacionesExpanded[solicitud.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
                      {cancelacion.esAdmin && (
                        <Typography variant="subtitle1" display="block" color="primary.main">
                          👨‍💼 Cancelado por administrador
                        </Typography>
                      )}
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
                onClick={() => setCancelacionExpandida(cancelacionExpandida === solicitud.id ? null : solicitud.id)}
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
                <Typography variant="h6">
                  Fechas Canceladas 
                </Typography>
                
                {cancelacionExpandida === solicitud.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Box>
              
              <Collapse in={cancelacionExpandida === solicitud.id}>
                <Box sx={{ ml: 2, mb: 2 }}>
                  {diasCancelados.map(fecha => {            
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
              {/* Editar - solo si se puede */}
              {puedeEditar && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    size="medium"
                    onClick={() => handleEditarSolicitud(solicitud)}
                    sx={{ 
                      color:"azul.main",
                      border:'1px solid blue',
                      '&:hover': { bgcolor: 'azul.fondo', transform: 'scale(1.05)' },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <EditIcon  sx={{ fontSize: '2rem' }} />
                  </IconButton>
                  <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    Editar
                  </Typography>
                </Box>
              )}

              {/* Cancelar - solo si se puede */}
              {puedeCancelar && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    size="medium"
                    onClick={() => handleAbrirCancelacion(solicitud)}
                    sx={{ 
                      color:"rojo.main",
                      border:'1px solid red',
                      '&:hover': { bgcolor: 'rojo.fondo', transform: 'scale(1.05)' },
                      transition: 'all 0.2s ease'
                    }}
                    title={solicitud.estado === 'pendiente' ? 'Eliminar solicitud' : 'Cancelar vacaciones'}
                  >
                    <EventBusyOutlinedIcon  sx={{ fontSize: '2rem' }} />
                  </IconButton>
                  <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    {solicitud.estado === 'pendiente' ? 'Eliminar' : 'Cancelar'}
                  </Typography>
                </Box>
              )}
              {/* Cancelar Parcialmente - solo si se puede */}
              {puedeCancelarParcialmente && (
                <Box sx={{ display: 'flex', justifyContent:'flex-start', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5,mt:2 }}>
                  <Box sx={{ display: 'flex', justifyContent:'center', flexDirection: 'column', alignItems: 'center'}}>
                  <IconButton
                    size="medium"
                    onClick={() => handleAbrirCancelacionParcial(solicitud)}
                    sx={{ 
                      textAlign:'right',
                      color:"naranja.main",
                      border:'1px solid orange',
                      '&:hover': { bgcolor: 'naranja.fondo', transform: 'scale(1.05)' },
                      transition: 'all 0.2s ease'
                    }}
                    title="Cancelar parcialmente"
                  >
                    <CancelIcon sx={{ fontSize: '2rem' }} />
                  </IconButton>

                  <Typography variant="body2" sx={{ width:'5rem', textAlign: 'center',mt:0.5 }}>
                    Cancelar parcialmente
                  </Typography>
                  </Box>
                </Box>
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

    return solicitudes.map(solicitud => (
      <SolicitudCard key={solicitud.id} solicitud={solicitud} />
    ));
  };

  return (
    <>
      {/* AppBar */}
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #1E40AF 100%)',
          boxShadow: '0 2px 10px rgba(59, 130, 246, 0.2)',
          zIndex: 1100
        }}
      >
      <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton edge="start" color="inherit"
            onClick={() => navigate('/vacaciones')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' },
              transition: 'all .3s ease'
            }}>
            <ArrowBackIcon />
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
              Mis Solicitudes
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Gestiona tus peticiones de vacaciones
            </Typography>
          </Box>         
          <CalendarMonthOutlinedIcon sx={{ fontSize: '2rem' }} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ pb: 4 }}>
        {/* Tabs */}
<Grid container spacing={1} sx={{ mb: 3, mt:2 }}>
  {/* Array de configuraciones para las tabs */}
  {[
    { label: 'Aprobadas', count: solicitudesAprobadas.length, color: 'verde' },
    { label: 'Pendientes', count: solicitudesPendientes.length, color: 'azul' },
    { label: 'Denegadas', count: solicitudesDenegadas.length, color: 'rojo' },
    { label: 'Canceladas', count: solicitudesCanceladas.length, color: 'dorado' },
  ].map((tab, index) => (
    <Grid size={{xs:6}} key={index}>
      <Button
        onClick={() => setTabActual(index)}
        fullWidth
        variant={tabActual === index ? 'contained' : 'outlined'}
        sx={{
          py: 2,
          color: tabActual === index ? 'white' : `${tab.color}.main`,
          bgcolor: tabActual === index ? `${tab.color}.main` : 'transparent',
          flexDirection: 'column',
          justifyContent: 'center',
          textTransform: 'none',
          minHeight: 80,
          transition: 'all 0.2s ease',
          borderColor: tabActual === index ? '' : 'grey.400', // Mantiene el borde en color divider
          '&:hover': {
            borderColor: 'divider',
            bgcolor: tabActual === index ? `${tab.color}.main` : 'rgba(0, 0, 0, 0.04)',
          }
        }}
      >
        <Typography variant="body1" fontWeight={600}>
          {tab.label}
        </Typography>
        <Chip
          label={tab.count}
          size="medium"
          sx={{
            mt: 1,
            bgcolor: tabActual === index ? 'white' : `${tab.color}.main`,
            color: tabActual === index ? `${tab.color}.main` : 'white',
            fontWeight: 600,
            fontSize:'1rem'
          }}
        />
      </Button>
    </Grid>
  ))}
</Grid>


        {/* Contenido de tabs */}
        <Box>
          {tabActual === 0 && renderSolicitudes(solicitudesAprobadas)}
          {tabActual === 1 && renderSolicitudes(solicitudesPendientes)}
          {tabActual === 2 && renderSolicitudes(solicitudesDenegadas)}
          {tabActual === 3 && renderSolicitudes(solicitudesCanceladas)}
        </Box>
      </Container>

      {/* Diálogo de cancelación */}
      <Dialog
        open={dialogoCancelacion}
        onClose={() => !cancelando && setDialogoCancelacion(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle variant='div' sx={{textAlign:'center', fontSize:'1.5rem', fontWeight:'bold', bgcolor: 'rojo.main', color:'white'}}>
          {solicitudACancelar?.estado === 'pendiente' ? 'Eliminar solicitud' : 'Cancelar vacaciones'}
        </DialogTitle>
        
        <DialogContent>
            {solicitudACancelar?.estado === 'pendiente' 
              ? <Typography variant="body1"  gutterBottom sx={{textAlign:'center', my:1}}>
                  Vas a eliminar esta solicitud pendiente. Esta acción es irreversible. ¿Estas seguro?
                </Typography>

              : <Typography variant="body1"  gutterBottom sx={{textAlign:'center', my:1}}>
                  Vas a cancelar estas vacaciones ya aprobadas con <strong>{formatearTiempoVacasLargo(horasDisponiblesParaCancelar)} disponibles</strong>. Explica brevemente el motivo.
                </Typography>}
          
        {solicitudACancelar?.estado === 'aprobada'&& 
        <>
          <TextField
            autoFocus
            margin="dense"
            label="Motivo de cancelación"
            fullWidth
            multiline
            rows={3}
            value={motivoCancelacion}
            onChange={(e) => setMotivoCancelacion(e.target.value)}
            placeholder="Ej: Error en las fechas, cambio de planes..."
            disabled={cancelando}
          />

          <Typography variant="body1" gutterBottom sx={{ textAlign: 'center', my: 1 }}>
            {solicitudACancelar?.estado === 'aprobada' && (
              <>
                Se devolverán {' '}
                <strong>
                  {formatearTiempoVacasLargo(horasDisponiblesParaCancelar)}
                </strong>
                {' '} a tu saldo
              </>
            )}
          </Typography>
          </> }
        </DialogContent>
        
        <DialogActions sx={{display:'flex', justifyContent:'space-between', px:2,pb:2}}>
          <Button 
            onClick={() => setDialogoCancelacion(false)}
            disabled={cancelando}
            color="primary"
            variant="outlined"
            sx={{textTransform: 'none', px:2, py:1.5}}
          >
            <Typography fontSize={'1.15rem'}>
            Cerrar
            </Typography>
          </Button>
          <Button 
            onClick={handleConfirmarCancelacion}
            color= 'error'
            variant="contained"
            sx={{textTransform: 'none', py:1.5,px:2}}
            disabled={cancelando || solicitudACancelar?.estado==='aprobada' && !motivoCancelacion.trim()}
            startIcon={cancelando ? <CircularProgress size={20} /> : <CancelIcon />}
          >
            <Typography fontSize={'1.15rem'}>
              {solicitudACancelar?.estado === 'pendiente' ?(
              cancelando ? 'Eliminando...' : 'Eliminar'
              ):(
            cancelando ? 'Cancelando...' : 'Cancelar')}
            </Typography>
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de cancelación parcial */}
      <Dialog
        open={dialogoCancelacionParcial}
        onClose={() => !procesandoCancelacionParcial && setDialogoCancelacionParcial(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle variant='div' textAlign='center' bgcolor='warning.main' sx={{color:'white' }}>
          <Typography variant="span" fontSize='1.25rem' >
            Cancelar Parcialmente
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          {solicitudParaCancelarParcial && (
            <Box sx={{ mb: 3, mt:1 }}>
              {/* Información de la solicitud */}
              <Typography textAlign='center' fontSize='1.3rem' fontWeight='bold' sx={{ mb: 2 }}>
                Solicitud original: {formatearTiempoVacasLargo(solicitudParaCancelarParcial.horasSolicitadas)}
              </Typography>

              {/*  Información de días disfrutados */}
              {obtenerDiasDisfrutados(solicitudParaCancelarParcial).length > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body1">
                     {obtenerDiasDisfrutados(solicitudParaCancelarParcial).length} día{obtenerDiasDisfrutados(solicitudParaCancelarParcial).length === 1 ? "" : "s"} ya disfrutado{obtenerDiasDisfrutados(solicitudParaCancelarParcial).length === 1 ? "" : "s"}
                  </Typography>
                </Alert>
              )}

              {/* Usar subcolecciones en lugar de diasCancelados */}
              {solicitudParaCancelarParcial.cancelacionesParciales && solicitudParaCancelarParcial.cancelacionesParciales.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body1">
                    Ya has cancelado {obtenerDiasCancelados(solicitudParaCancelarParcial.cancelacionesParciales).length} día{obtenerDiasCancelados(solicitudParaCancelarParcial.cancelacionesParciales).length === 1 ? "" : "s"} anteriormente
                  </Typography>
                </Alert>
              )}

              {/*  Resumen de disponibilidad */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 4 }}>
                <Typography variant="body2" textAlign="center" sx={{ mb: 1 }}>
                  <strong>Resumen de disponibilidad</strong>
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={{xs:4}}>
                    <Typography variant="caption" textAlign="center" display="block" color="text.secondary">
                      Total original
                    </Typography>
                    <Typography variant="body2" textAlign="center" fontWeight={600}>
                      {Math.round(solicitudParaCancelarParcial.horasSolicitadas / 8)} {Math.round(solicitudParaCancelarParcial.horasSolicitadas / 8)===1 ? "día" : "días"}
                    </Typography>
                  </Grid>
                  <Grid size={{xs:4}}>
                    <Typography variant="caption" textAlign="center" display="block" color="success.main">
                      Disfrutados
                    </Typography>
                    <Typography variant="body2" textAlign="center" fontWeight={600}>
                      {obtenerDiasDisfrutados(solicitudParaCancelarParcial).length} {obtenerDiasDisfrutados(solicitudParaCancelarParcial).length === 1 ? "día" : "días"}
                    </Typography>
                  </Grid>
                  <Grid size={{xs:4}}>
                    <Typography variant="caption" textAlign="center" display="block" color="warning.main">
                      Cancelados
                    </Typography>
                    <Typography variant="body2" textAlign="center" fontWeight={600}>
                      {obtenerDiasCancelados(solicitudParaCancelarParcial.cancelacionesParciales || []).length} {obtenerDiasCancelados(solicitudParaCancelarParcial.cancelacionesParciales || []).length===1 ? "día" : "días"}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/*  SELECTOR dias cancelacion parcial */}
              <SelectorDiasCancelacion
                solicitud={solicitudParaCancelarParcial}
                onDiasSeleccionados={setDiasACancelar}
                diasSeleccionados={diasACancelar}
                esAdmin={false}
              />
              
              {/* Campo de motivo */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Motivo de la cancelación parcial"
                value={motivoCancelacionParcial}
                onChange={(e) => setMotivoCancelacionParcial(e.target.value)}
                placeholder="Ej: Ya no necesito estos días, ha cambiado mi situación..."
                disabled={procesandoCancelacionParcial}
                required
                helperText="Especifica por qué necesitas cancelar estos días"
                sx={{ mt: 2 }}
                error={motivoCancelacionParcial.trim() === '' && diasACancelar.length > 0}
              />

              {/* Información de devolución */}
              {diasACancelar.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body1">
                    Se devolverán <strong>{formatearTiempoVacasLargo(diasACancelar.length * 8)}</strong> a tu saldo disponible
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{display:'flex', justifyContent:'space-between', px:2, pb:2}}>
          <Button
            onClick={() => setDialogoCancelacionParcial(false)}
            disabled={procesandoCancelacionParcial}
            variant="outlined"
            color="primary"
            sx={{textTransform: 'none', py:1.5}}
          >
            <Typography fontSize={'1.1rem'}>
              Cerrar
            </Typography>
          </Button>

          <Button
            sx={{textTransform: 'none', py:1.5}}
            onClick={handleConfirmarCancelacionParcial}
            disabled={procesandoCancelacionParcial || diasACancelar.length === 0 || motivoCancelacionParcial.trim() === ''}
            variant="contained"
            color="warning"
            startIcon={procesandoCancelacionParcial ? <CircularProgress size={20} /> : <CancelIcon />}
          >
            <Typography fontSize={'1.1rem'}>
              {procesandoCancelacionParcial ? 'Procesando...' : `Cancelar ${diasACancelar.length} día${diasACancelar.length === 1 ? '' : 's'}`}
            </Typography>
          </Button>
        </DialogActions>
      </Dialog>
    
    </>
  );
};

export default MisSolicitudesVacaciones;
