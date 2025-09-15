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
import { formatearFechaCorta, ordenarFechas, esFechaPasadaOHoy } from '../../utils/dateUtils';
import SelectorDiasCancelacion from '../Admin/Vacaciones/SelectorDiasCancelacion';

const MisSolicitudesVacaciones = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    loadSolicitudesConCancelaciones, 
    cancelarSolicitudVacaciones,
    cancelarSolicitudParcial,
    obtenerDiasCancelados,      
    obtenerDiasDisfrutados,     
    puedeCancelarParcialmente, 
    loading 
  } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();
  const [solicitudesVacaciones, setSolicitudesVacaciones] = useState([]);

  // Estados principales
  const [tabActual, setTabActual] = useState(0);
  const [solicitudExpandida, setSolicitudExpandida] = useState(null);
  // Estado para Acordeon de Cancelaciones Parciales
  const [cancelacionesExpanded, setCancelacionesExpanded] = useState({});
  
  // Estados para cancelación
  const [dialogoCancelacion, setDialogoCancelacion] = useState(false);
  const [solicitudACancelar, setSolicitudACancelar] = useState(null);
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
    console.log (diasDisponibles)
    return {
      puedeEditar: solicitud.estado === 'pendiente' && diasDisponibles.length > 0,
      puedeCancelar: (solicitud.estado === 'pendiente' || solicitud.estado === 'aprobada') 
                     && diasDisponibles.length > 0 
                     && !solicitud.esAjusteSaldo,
      puedeCancelarParcialmente: solicitud.estado === 'aprobada' 
                                && !esHorasSueltas 
                                && diasDisponibles.length > 1
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
    setMotivoCancelacion('');
    setDialogoCancelacion(true);
  };

  // Función para confirmar cancelación
 // ✅ MODIFICAR: Función de cancelación para usar nueva lógica
  const handleConfirmarCancelacion = async () => {
    if (!motivoCancelacion.trim()) {
      showError('Debes escribir un motivo para cancelar la solicitud');
      return;
    }

    setCancelando(true);
    try {
      // ✅ USAR la nueva función directamente
      await cancelarSolicitudVacaciones(solicitudACancelar, motivoCancelacion);
      
      const tipoTexto = solicitudACancelar.estado === 'pendiente' ? 'retirada' : 'cancelada';
      showSuccess(`Solicitud ${tipoTexto} correctamente`);
      
      setDialogoCancelacion(false);
      setSolicitudACancelar(null);
      setMotivoCancelacion('');
      
      // ✅ RECARGAR solicitudes
      const solicitudes = await loadSolicitudesConCancelaciones(user?.email);
      setSolicitudesVacaciones(solicitudes);
      
    } catch (error) {
      showError('Error al cancelar la solicitud: ' + error.message);
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
    const { puedeEditar, puedeCancelar, puedeCancelarParcialmente } = puedeGestionarSolicitud(solicitud);
    const colorEstado = getColorEstado(solicitud.estado);
    const diasCancelados = obtenerDiasCancelados(solicitud.cancelacionesParciales || []);
    const diasDisfrutados = obtenerDiasDisfrutados(solicitud);
    const cancelacionesParciales = solicitud.cancelacionesParciales || [];
    const tieneCancelacionesParciales = cancelacionesParciales.length > 0;

    return (
      <Card sx={{ mb: 3, borderLeft: `4px solid ${colorEstado.color}` }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{xs:12, md:6}}>
              <Box sx={{ display: 'flex', justifyContent:"space-between", alignItems: 'center', gap: 1 }}>
                <Box sx={{flex:1}} >
                  <Chip
                    label={solicitud.estado.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor: colorEstado.bgcolor,
                      color: colorEstado.color,
                      fontWeight: 600
                    }}
                  />
                  {solicitud.fechaSolicitud !== solicitud.fechaSolicitudOriginal && (
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
                {solicitud.fechaSolicitud !== solicitud.fechaSolicitudOriginal && (
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
                </Box>
              </Box>
                              {tieneCancelacionesParciales && (
                  <Alert 
                    severity="warning" 
                    sx={{ my: 2, }}
                    icon={<CancelIcon />}
                  >
                     <Typography variant="body1" display="block">
                    Esta solicitud tiene {cancelacionesParciales.length} cancelación{cancelacionesParciales.length > 1 ? 'es' : ''} parcial{cancelacionesParciales.length > 1 ? 'es' : ''}
                    </Typography>
                  </Alert>
                )}
           <Typography  sx={{ fontWeight: 600, fontSize:'1.2rem' }}>
             Pedido Originalmente: {formatearTiempoVacasLargo(solicitud.horasSolicitadas)}
          </Typography>
                        {/*  Mostrar saldos en solicitudes aprobadas/denegadas */}
              {(solicitud.estado === 'aprobada' || solicitud.estado === 'denegada') && 
              (solicitud.horasDisponiblesAntesCambio !== undefined) && (
                <Alert severity="info" sx={{ mt: 1, bgcolor: 'info.50' }}>
                  <Typography variant="h6" display="block">
                    Saldo al {solicitud.estado === 'aprobada' ? 'aprobar' : 'denegar'}:
                  </Typography>
                  <Grid container sx={{ mt: 0.5 }}>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body1" display="block">
                        Antes: {formatearTiempoVacasLargo(solicitud.horasDisponiblesAntesCambio)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body1" display="block">
                        Después: {formatearTiempoVacasLargo(solicitud.horasDisponiblesDespuesCambio || 0)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Alert>
              )}
          

          {tieneCancelacionesParciales && (
            <Typography variant="body2" color="info.main" sx={{ mb: 1 }}>
              Días devueltos por cancelaciones: {formatearTiempoVacasLargo(diasCancelados.length * 8)}
            </Typography>
          )}

          {/* ✅ MODIFICADA: Lista de fechas con estados visuales */}
          {solicitud.fechas.length === 1 ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Fecha: {formatearFechaCorta(solicitud.fechas[0])}
            </Typography>
          ) : (
            <>
              <Box
                onClick={() => setSolicitudExpandida(solicitudExpandida === solicitud.id ? null : solicitud.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 1,
                  bgcolor: `${colorEstado.fondo}.fondo`,
                  borderRadius: 1,
                  '&:hover': { bgcolor: `${colorEstado.fondo}.fondoFuerte` },
                  
                }}
              >
                <Typography variant="h6">
                  {solicitud.estado === 'cancelado'
                    ? `Fechas canceladas`
                    : `Fechas `
                  }
                </Typography>
                {solicitudExpandida === solicitud.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Box>
              
              <Collapse in={solicitudExpandida === solicitud.id}>
                <Box sx={{ ml: 2, mb: 2 }}>
                  {ordenarFechas(solicitud.fechas).map(fecha => {
                    const estaCancelado = diasCancelados.includes(fecha);
                    const estaDisfrutado = diasDisfrutados.includes(fecha);
                    
                    return (
                      <Typography 
                        key={fecha} 
                        variant="body1" 
                        sx={{ 
                          mb: 0.5,
                          ...(estaCancelado && {
                            textDecoration: 'line-through',
                            color: 'grey'
                          }),
                          ...(estaDisfrutado && {
                            fontStyle: 'italic',
                            color: 'success.main'
                          })
                        }}
                      >
                        • {formatearFechaCorta(fecha)}
                        {estaCancelado && ' (cancelado)'}
                        {estaDisfrutado && ' (disfrutado)'}
                      </Typography>
                    );
                  })}
                </Box>
              </Collapse>
            </>
          )}

          {/* ✅ NUEVO: Acordeón de cancelaciones parciales */}
          {tieneCancelacionesParciales && (
            <>
              <Divider sx={{ my: 2 }} />
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
                <Typography variant="h6"  sx={{ flexGrow: 1 }}>
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
                      <Typography variant="subtitle1" display="block" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Cancelación #{index + 1}
                      </Typography>
                      {/* Mostrar saldos antes y después */}
                      <Grid container  sx={{ mb: 1 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="subtitle1" display="block" color="text.secondary">
                            Saldo antes: {formatearTiempoVacasLargo(cancelacion.horasDisponiblesAntesCancelacion || 0)}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="subtitle1" display="block" color="success.main">
                            Saldo después: {formatearTiempoVacasLargo(cancelacion.horasDisponiblesDespuesCancelacion || 0)}
                          </Typography>
                        </Grid>
                      </Grid>
                      <Typography variant="subtitle1" display="block" bgcolor="grey.00">
                        Días Cancelados:
                      </Typography>
                      {cancelacion.fechasCanceladas.map(f => (
                        <Typography key={f} variant="subtitle1" display="block" sx={{ ml: 2 }}>
                          • {formatearFechaCorta(f)}
                        </Typography>
                      ))}
                      <Typography variant="subtitle1" display="block" >
                        Cancelado el: {formatearFechaCorta(cancelacion.fechaCancelacion)}
                      </Typography>
                      <Typography variant="subtitle1" display="block">
                        Devuelto: {formatearTiempoVacasLargo(cancelacion.horasDevueltas)}
                      </Typography>
                      <Box display='flex' >
                      <Typography variant="subtitle1" display="block" >
                        Motivo:
                      </Typography>
                      <Typography variant="subtitle1" display="block" sx={{ fontStyle:'italic'}}>
                        {' '+cancelacion.motivoCancelacion}
                      </Typography>
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

              {solicitud.comentariosSolicitante && (
                <Typography variant="body1" sx={{ fontStyle: 'italic', mt: 1 }}>
                  "{solicitud.comentariosSolicitante}"
                </Typography>
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

              {solicitud.comentariosAdmin && (
                <Alert 
                  severity={
                    solicitud.estado === 'aprobada' ? 'success' : 
                    solicitud.estado === 'cancelado' ? 'info' : 'error'
                  } 
                  sx={{ mt: 1 }}
                >
                  <Typography variant="body1">
                    <strong>Respuesta:</strong><br/> {solicitud.comentariosAdmin}
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
                    title={solicitud.estado === 'pendiente' ? 'Retirar solicitud' : 'Cancelar vacaciones'}
                  >
                    <EventBusyOutlinedIcon  sx={{ fontSize: '2rem' }} />
                  </IconButton>
                  <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    {solicitud.estado === 'pendiente' ? 'Retirar' : 'Cancelar'}
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
    { label: 'Pendientes', count: solicitudesPendientes.length, color: 'azul' },
    { label: 'Aprobadas', count: solicitudesAprobadas.length, color: 'verde' },
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
          {tabActual === 0 && renderSolicitudes(solicitudesPendientes)}
          {tabActual === 1 && renderSolicitudes(solicitudesAprobadas)}
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
        <DialogTitle variant='div' sx={{textAlign:'center', fontSize:'1.5rem', fontWeight:'bold', bgcolor: solicitudACancelar?.estado === 'pendiente' ? 'naranja.main' : 'rojo.main', color:'white'}}>
          {solicitudACancelar?.estado === 'pendiente' ? 'Retirar solicitud' : 'Cancelar vacaciones'}
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1"  gutterBottom sx={{textAlign:'center', my:1}}>
            {solicitudACancelar?.estado === 'pendiente' 
              ? 'Vas a retirar esta solicitud pendiente. Explica brevemente el motivo:'
              : 'Vas a cancelar estas vacaciones ya aprobadas. Explica brevemente el motivo:'
            }
          </Typography>
          
        
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
            color={solicitudACancelar?.estado==='pendiente' ? 'warning' : 'error'}
            variant="contained"
            sx={{textTransform: 'none', py:1.5,px:2}}
            disabled={cancelando || !motivoCancelacion.trim()}
            startIcon={cancelando ? <CircularProgress size={20} /> : <CancelIcon />}
          >
            <Typography fontSize={'1.15rem'}>
              {solicitudACancelar?.estado === 'pendiente' ?(
              cancelando ? 'Retirando...' : 'Retirar'
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
              {/* ✅ MEJORADO: Información de la solicitud */}
              <Typography textAlign='center' fontSize='1.3rem' fontWeight='bold' sx={{ mb: 2 }}>
                Solicitud original: {formatearTiempoVacasLargo(solicitudParaCancelarParcial.horasSolicitadas)}
              </Typography>

              {/* ✅ MEJORADO: Información de días disfrutados */}
              {obtenerDiasDisfrutados(solicitudParaCancelarParcial).length > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body1">
                     {obtenerDiasDisfrutados(solicitudParaCancelarParcial).length} día{obtenerDiasDisfrutados(solicitudParaCancelarParcial).length === 1 ? "" : "s"} ya disfrutado{obtenerDiasDisfrutados(solicitudParaCancelarParcial).length === 1 ? "" : "s"}
                  </Typography>
                </Alert>
              )}

              {/* ✅ CORREGIDO: Usar subcolecciones en lugar de diasCancelados */}
              {solicitudParaCancelarParcial.cancelacionesParciales && solicitudParaCancelarParcial.cancelacionesParciales.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body1">
                    Ya has cancelado {obtenerDiasCancelados(solicitudParaCancelarParcial.cancelacionesParciales).length} día{obtenerDiasCancelados(solicitudParaCancelarParcial.cancelacionesParciales).length === 1 ? "" : "s"} anteriormente
                  </Typography>
                </Alert>
              )}

              {/* ✅ AÑADIDO: Resumen de disponibilidad */}
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

              {/* ✅ SELECTOR corregido */}
              <SelectorDiasCancelacion
                solicitud={solicitudParaCancelarParcial}
                onDiasSeleccionados={setDiasACancelar}
                diasSeleccionados={diasACancelar}
                esAdmin={false}
              />
              
              {/* ✅ MEJORADO: Campo de motivo */}
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
                helperText="Especifica por qué necesitas cancelar solo estos días"
                sx={{ mt: 2 }}
                error={motivoCancelacionParcial.trim() === '' && diasACancelar.length > 0}
              />

              {/* ✅ AÑADIDO: Información de devolución */}
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
