// components/Vacaciones/MisSolicitudesVacaciones.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
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
    solicitudesVacaciones, 
    loadMisSolicitudesVacaciones,
    cancelarSolicitudVacaciones,
    cancelarSolicitudParcial,
    loading 
  } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [tabActual, setTabActual] = useState(0);
  const [solicitudExpandida, setSolicitudExpandida] = useState(null);
  
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

  // Cargar solicitudes al montar
  useEffect(() => {
    const unsubscribe = loadMisSolicitudesVacaciones(user?.email);
    return () => unsubscribe && unsubscribe();
  }, [user?.email, loadMisSolicitudesVacaciones]);

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
  const handleConfirmarCancelacion = async () => {
    if (!motivoCancelacion.trim()) {
      showError('Debes escribir un motivo para cancelar la solicitud');
      return;
    }

    setCancelando(true);
    try {
      // Calcular días no cancelados si la solicitud tiene cancelaciones parciales
      const diasYaCancelados = solicitudACancelar?.diasCancelados || [];
      const diasRestantes = solicitudACancelar.fechas.filter(
        fecha => !diasYaCancelados.includes(fecha)
      );
      
      // Ajustar las horas a cancelar si hay cancelaciones parciales previas
      const horasAjustadas = diasYaCancelados.length===0 ? solicitudACancelar.horasSolicitadas : (diasRestantes.length * 8);
      
      
      // Crear una solicitud ajustada para la cancelación
      const solicitudAjustada = {
        ...solicitudACancelar,
        horasSolicitadas: horasAjustadas,
        fechas: diasRestantes
      };
      
      await cancelarSolicitudVacaciones(solicitudAjustada, motivoCancelacion);
      
      const tipoTexto = solicitudACancelar.estado === 'pendiente' ? 'retirada' : 'cancelada';
      showSuccess(`Solicitud ${tipoTexto} correctamente`);
      
      setDialogoCancelacion(false);
      setSolicitudACancelar(null);
      setMotivoCancelacion('');
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
      
      const resultado = await cancelarSolicitudParcial(
        solicitudParaCancelarParcial,
        diasACancelar,
        motivoCancelacionParcial
      );

      showSuccess(
        `Cancelación parcial procesada correctamente. (${resultado.diasCancelados} días devueltos a tu saldo)`
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

  const puedeSerCanceladaParcialmente = (solicitud) => {
    if (solicitud.estado !== 'aprobada' || solicitud.horasSolicitadas<=8) return false;
    
    const diasDisponibles = solicitud.fechas.filter(fecha => {
      const esFechaPasada = esFechaPasadaOHoy(fecha);
      const yaFueCancelado = (solicitud.diasCancelados || []).includes(fecha);
      return !esFechaPasada && !yaFueCancelado ;
    });

    return diasDisponibles.length > 0;
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

  // Función para determinar acciones disponibles
  const puedeGestionarSolicitud = (solicitud) => {
    const primeraFecha = solicitud.fechas[0];
    const esFechaFutura = !esFechaPasadaOHoy(primeraFecha);
    
    return {
      puedeEditar: solicitud.estado === 'pendiente' && esFechaFutura,
      puedeCancelar: (solicitud.estado === 'pendiente' || solicitud.estado === 'aprobada') && esFechaFutura && !solicitud.esAjusteSaldo,
      puedeCancelarParcialmente: puedeSerCanceladaParcialmente(solicitud) 
    };
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

  const SolicitudCard = ({ solicitud }) => {
    const { puedeEditar, puedeCancelar } = puedeGestionarSolicitud(solicitud);
    const colorEstado = getColorEstado(solicitud.estado);

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
                {solicitud.estado === 'aprobada' && solicitud.diasCancelados?.length>0 &&(
                  <Typography variant="body1" textAlign="right" fontWeight={600} sx={{color:"naranja.main", mb:1}}>
                    Cancelada Parcialmente
                  </Typography>
                )}

              <Typography variant="h6"  sx={{mt:2}}>
                {solicitud?.esCancelacionParcial 
                ?"Cancelación Parcial: "
                :"Solicitado Inicialmente: " 
                }
                <strong>{formatearTiempoVacasLargo(solicitud.horasSolicitadas)}</strong>
                
              </Typography>

                {solicitud.fechas.length === 1 
                  ? (<Typography variant="h6"  gutterBottom>
                    Fecha: <strong>{formatearFechaCorta(solicitud.fechas[0])}</strong></Typography>)
                  : (
                    <Box>
                        <Box 
                            onClick={() => setSolicitudExpandida(solicitudExpandida === solicitud.id ? null : solicitud.id)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                p: 1,
                                bgcolor:  `${colorEstado.fondo}.fondo`,
                                borderRadius: 1,
                                '&:hover': { bgcolor: `${colorEstado.fondo}.fondoFuerte` },
                            }}
                        >
                            <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
                              {solicitud.estado==='cancelado'
                              ? `Fechas (${solicitud.fechas.length-(solicitud.diasCancelados?.length||0)}) canceladas`
                              : `Fechas (${solicitud.fechas.length-(solicitud.diasCancelados?.length||0)})`
                              }
                            </Typography>
                            {solicitudExpandida === solicitud.id 
                                ? <ExpandLessIcon sx={{fontSize:'2rem', color:'black'}}/> 
                                : <ExpandMoreIcon sx={{fontSize:'2rem', color:'black'}}/>}
                        </Box>
                        
                        <Collapse in={solicitudExpandida === solicitud.id}>
                            <Box sx={{ mt: 1 }}>
                                {ordenarFechas(solicitud.fechas).map(f => (
                                  !solicitud.diasCancelados?.includes(f) ? (
                                    <Typography textAlign='center' key={f} variant="h6" display="block" sx={{ }}>
                                        • {formatearFechaCorta(f)}
                                    </Typography>
                                  ) : (
                                    <Typography textAlign='center' key={f} variant="h6" display="block" sx={{ textDecoration: 'line-through', color: 'grey.600' }}>
                                        • {formatearFechaCorta(f)}
                                    </Typography>
                                  )
                                ))}
                            </Box>
                        </Collapse>
                    </Box>
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

                 {/* Dias Cancelados */}
                {solicitud.diasCancelados && solicitud.diasCancelados.length > 0 && (
                  <Alert 
                    severity="warning" 
                    sx={{ mt: 1 }}
                  >
                    <Typography variant="div">
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
              {puedeGestionarSolicitud(solicitud).puedeCancelarParcialmente && (
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
          
          {solicitudACancelar && solicitudACancelar.diasCancelados && (
            <Box  sx={{ my: 2, bgcolor:'azul.fondo' }}>
              <Typography variant='div' sx={{fontSize:'1.1rem'}}>
                <strong>•{formatearTiempoVacasLargo(solicitudACancelar.horasSolicitadas)} </strong>solicitados
                <Divider sx={{bgcolor:'black', mb: 1 }} />
                <strong>•{formatearTiempoVacasLargo(solicitudACancelar.diasCancelados.length*8)} </strong>cancelados previamente
                <br/>
                <strong>•{formatearTiempoVacasLargo((solicitudACancelar.horasSolicitadas - (solicitudACancelar.diasCancelados.length*8)))} </strong>restantes por cancelar

              </Typography>
            </Box>
          )}

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
              <Typography textAlign='center' fontSize='1.3rem' fontWeight='bold' >
                Solicitud original: {formatearTiempoVacasLargo(solicitudParaCancelarParcial.horasSolicitadas)}
              </Typography>
              {diasDisfrutados(solicitudParaCancelarParcial) > 0 && (
            <Typography variant="body1" color="success.main" textAlign='center'  sx={{ }}>
              {diasDisfrutados(solicitudParaCancelarParcial)}{diasDisfrutados(solicitudParaCancelarParcial)==1?" dia disfrutado ":" dias disfrutados "}
            </Typography>
            )}           
              {solicitudParaCancelarParcial.diasCancelados && solicitudParaCancelarParcial.diasCancelados.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Ya has cancelado {solicitudParaCancelarParcial.diasCancelados.length} día(s) anteriormente
                  </Typography>
                </Alert>
              )}
              
              <SelectorDiasCancelacion
                fechasDisponibles={solicitudParaCancelarParcial.fechas}
                onDiasSeleccionados={setDiasACancelar}
                diasSeleccionados={diasACancelar}
                diasYaCancelados={solicitudParaCancelarParcial.diasCancelados || []}
              />
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Motivo de la cancelación parcial"
                value={motivoCancelacionParcial}
                onChange={(e) => setMotivoCancelacionParcial(e.target.value)}
                placeholder="Ej: Ya no necesito estos días, va a llover..."
                disabled={procesandoCancelacionParcial}
                required
                helperText="Especifica por qué necesitas cancelar solo estos días"
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{display:'flex', justifyContent:'space-between', px:2,pb:2}}>
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
            disabled={procesandoCancelacionParcial || diasACancelar.length === 0}
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
