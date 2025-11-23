// components/Vacaciones/MisSolicitudesVacaciones.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar, Paper,
  IconButton, Chip, Grid, Menu, MenuItem, ListItemIcon, ListItemText, Alert, Dialog, Collapse, Divider,
  DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress
} from '@mui/material';
import {
  Euro,
  ListAlt as ListAltIcon,
  ArrowBackIosNew as ArrowBackIcon,
  EventBusyOutlined as EventBusyOutlinedIcon,
  HistoryOutlined as HistoryIcon,
  Add as AddIcon,
  EditOutlined as EditIcon,
  CancelOutlined as CancelIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  DeleteForeverOutlined as DeleteForeverIcon,
  ClearOutlined as ClearIcon

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
    solicitudesVacaciones,
    loadSolicitudesVacaciones, 
    eliminarSolicitudVacaciones,
    cancelarDiasSolicitudVacaciones,  
    cancelarVentaVacaciones, 
    puedeCancelarDias,
    obtenerDiasCancelados,      
    obtenerDiasDisfrutados,      
    loading 
  } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [tabActual, setTabActual] = useState(0);
  const [solicitudExpandida, setSolicitudExpandida] = useState({});
  const [cancelacionesExpanded, setCancelacionesExpanded] = useState({});
  
  // Estados para cancelación
  
  const [dialogoCancelacionDias, setDialogoCancelacionDias] = useState(false);
  const [solicitudACancelar, setSolicitudACancelar] = useState(null);
  const [diasACancelar, setDiasACancelar] = useState([]);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);


 useEffect(() => {
        if (!user?.email) return; 
      const unsubscribe = loadSolicitudesVacaciones(user?.email);    
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }, [user?.email, loadSolicitudesVacaciones]);

  const puedeGestionarSolicitud = (solicitud) => {
  // Para ventas, lógica especial
  if (solicitud.esVenta) {
    return {
      puedeEditar: false,
      puedeCancelar: solicitud.estado === 'pendiente',
      puedeCancelarDias: false,
      esVenta: true
    };
  }

  const diasFuturos = (solicitud.fechasActuales || []).filter(fecha => !esFechaPasadaOHoy(fecha));

  return {
    puedeEditar: solicitud.estado === 'pendiente' && !solicitud.esAjusteSaldo,
    puedeCancelar:( solicitud.estado === 'pendiente' || solicitud.estado === 'aprobada') && diasFuturos.length > 0 && !solicitud.esAjusteSaldo,
    puedeCancelarDias: puedeCancelarDias(solicitud, false), // Usar función del store
    diasDisponibles: diasFuturos
  };
};

  // Filtrar solicitudes por estado
  const solicitudesPendientes = solicitudesVacaciones.filter(s => s.estado === 'pendiente');
  const solicitudesAprobadas = solicitudesVacaciones.filter(s => s.estado === 'aprobada');
  const solicitudesDenegadas = solicitudesVacaciones.filter(s => s.estado === 'denegada');
  const solicitudesCanceladas = solicitudesVacaciones.filter(s => s.estado === 'cancelado');


  const handleAbrirCancelacionDias = (solicitud) => {
    setSolicitudACancelar(solicitud);
    setDiasACancelar([]);
    setMotivoCancelacion('');
    setDialogoCancelacionDias(true);
  };

    const handleConfirmarCancelacionDias = async () => {
      if (!motivoCancelacion.trim()) {
        showError('Debes especificar un motivo para la cancelación');
        return;
      }

      // Si es solicitud pendiente, eliminar directamente
      if (solicitudACancelar.estado === 'pendiente') {
        try {
          setProcesandoCancelacion(true);
          await eliminarSolicitudVacaciones(
            solicitudACancelar.id,
            solicitudACancelar.horasSolicitadas,
            solicitudACancelar.solicitante
          );
          showSuccess(solicitudACancelar.esVenta?'Venta de Vacaciones eliminada correctamente':'Solicitud de Vacciones eliminada correctamente');
          setDialogoCancelacionDias(false);
          setSolicitudACancelar(null);
          setMotivoCancelacion('');
        } catch (error) {
          showError('Error al eliminar la solicitud: ' + error.message);
        } finally {
          setProcesandoCancelacion(false);
        }
        return;
      }

      // Cancelación de días de vacaciones aprobadas
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
          false
        );
        
        const mensaje = resultado.esCancelacionTotal
          ? 'Días restantes de la solicitud cancelados completamente'
          : `${diasACancelar.length} día${diasACancelar.length > 1 ? 's' : ''} cancelado${diasACancelar.length > 1 ? 's' : ''} correctamente`;
        
        showSuccess(mensaje);
        setDialogoCancelacionDias(false);
        setSolicitudACancelar(null);
        setDiasACancelar([]);
        setMotivoCancelacion('');
      } catch (error) {
        showError('Error al cancelar días: ' + error.message);
      } finally {
        setProcesandoCancelacion(false);
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

    // Acciones desde el menú
    const handleAccionMenu = (accion, solicitud) => {
      
      switch (accion) {
        case 'editar':
          handleEditarSolicitud(solicitud);
          break;
        case 'cancelar':
          handleAbrirCancelacionDias(solicitud);
          break;
        default:
          break;
      }
    };

  //  Toggle para acordeón de cancelaciones parciales  
  const toggleCancelacionesExpanded = (solicitudId) => {
    setCancelacionesExpanded(prev => ({
      ...prev,
      [solicitudId]: !prev[solicitudId]
    }));
  };
  const toggleSolicitudExpanded = (solicitudId) => {
    setSolicitudExpandida(prev => ({
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
    const { puedeEditar, puedeCancelar, puedeCancelarDias } = puedeGestionarSolicitud(solicitud);
    const colorEstado = getColorEstado(solicitud.estado);
    const diasCancelados = obtenerDiasCancelados(solicitud.cancelaciones)
    const diasDisfrutados = obtenerDiasDisfrutados(solicitud);
    const cancelaciones = solicitud.cancelaciones || [];
    const tieneCancelaciones = cancelaciones.length > 0;    
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButtonRef = React.useRef(null);

    const handleAbrirMenu = (event) => {
      event.stopPropagation();
      setMenuOpen(true);
    };

    const handleCerrarMenu = () => {
      setMenuOpen(false);
    };

    
    return (
      <Card sx={{ mb: 2, borderLeft: `4px solid ${colorEstado.color}` }}>
        <CardContent sx={{mb:-2}}>
          <Grid container spacing={1} alignItems="center">
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
                      bgcolor: colorEstado.bgcolor,
                      color: colorEstado.color,
                      fontWeight: 600,
                      height: 20, 
                      '& .MuiChip-label': {
                        fontSize: '0.65rem', 
                        px:0.5
                      },
                    }}
                  />
                </Box>
                <Box sx={{flex:0}}>
                {/* Menú de 3 puntos (solo si hay acciones disponibles) */}
                {(puedeEditar || puedeCancelar) && (
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
                    <MoreVertIcon />
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
                  {puedeEditar && (
                  <MenuItem onClick={() => handleAccionMenu('editar', solicitud)}>
                    <ListItemIcon>
                      <EditIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    </ListItemIcon>
                    <ListItemText primary="Editar Solicitud" />
                  </MenuItem>
                )}
                {puedeCancelar && (
                  <MenuItem onClick={() => handleAccionMenu('cancelar', solicitud)}>
                    <ListItemIcon>
                      <CancelIcon fontSize="small" sx={{ color: 'warning.main' }} />
                    </ListItemIcon>
                    <ListItemText primary={solicitud.estado==="pendiente"?"Eliminar":"Cancelar días"} />
                  </MenuItem>
                )}
              </Menu>
                </>
                )}
              </Box>
              </Box>
              <Box
                onClick={() => toggleSolicitudExpanded(solicitud.id)}
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
            <Typography  sx={{ fontWeight: 600, fontSize:'1.3rem', mt:3, textAlign:'center' }}>
              Ajuste de saldo             
             </Typography>
             <Typography  sx={{ fontWeight: 600, fontSize:'1.2rem', textAlign:'center', color: 
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
              {solicitudExpandida[solicitud.id] ? <ExpandLessIcon sx={{fontSize:'2rem'}}/> : <ExpandMoreIcon sx={{fontSize:'2rem'}} />}        
              </Box>
              <Grid size={{ xs: 12 }}>
               <Collapse in={solicitudExpandida[solicitud.id]}>
              {/*  Mostrar saldos en solicitudes aprobadas */}
                {solicitud.horasDisponiblesAntes !== undefined && solicitud.horasDisponiblesAntes !=solicitud.horasDisponiblesDespues && (
                <Box sx={{ p:1, bgcolor: '#fafafa', border:'2px solid', borderRadius:2, borderColor: solicitud.esAjusteSaldo 
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
                    {solicitud.esVenta && solicitud.cantidadARecibir && (
                    <Grid size={{ xs: 12 }}>
                      <Box display='flex' justifyContent='space-between'>
                      <Typography variant="h6" sx={{ color:'success.dark', fontStyle: 'italic' }}>
                        Cantidad a Recibir:
                      </Typography>
                      <Typography variant="h6" sx={{ color:'success.dark', fontStyle: 'italic' }}>
                        {solicitud.cantidadARecibir}€
                      </Typography>
                      </Box>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
              

          {/*  Lista de fechas con estados visuales */}
          {!solicitud?.esAjusteSaldo && !solicitud.esVenta && (
            <>
          {(solicitud.fechas.length === 1)? (
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
                  borderColor: `${colorEstado.bgcolor}`,
                  borderRadius: 2,
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
                  p: 1,
                  mt:1,
                  border:'2px solid',
                  borderColor: `${colorEstado.fondo}.main`,
                  borderRadius: 3,         
                }}
              >
                <Typography fontSize={'1.15rem'}>
                  Fechas solicitadas ({solicitud.fechas.length})
                </Typography>
              </Box>
                <Grid container sx={{mt:0.5,}} spacing={0.5}>
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
                <Box sx={{ p: 1.5, mt:1, bgcolor: '#f1f1f1', borderRadius: 2, borderLeft: `4px solid ${solicitud.esAjusteSaldo
                ?
                solicitud.tipoAjuste === 'añadir' ? 'green' : 
                solicitud.tipoAjuste === 'reducir' ? 'red' : 'blue'
                
                :
                solicitud.estado === 'aprobada' ? 'green' : 
                solicitud.estado === 'cancelado' ? 'brown' : 'red'}` }}>
                  <Typography variant="body1" display="block" fontWeight={600}>
                    💬 Tus comentarios:
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
                
                <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '1.1rem' }}>
                  ❌ Días Cancelados: {diasCancelados.length === 1 ? formatearTiempoVacasLargo(cancelaciones[0].horasDevueltas) : `${diasCancelados.length} dias`}
                </Typography>

                <Box
                  onClick={() => toggleCancelacionesExpanded(solicitud.id)}
                  sx={{
                    mb:1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    bgcolor:'warning.lighter',
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: 'warning.main',
                    '&:hover': { bgcolor: 'warning.light' }
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="warning.dark">
                    {cancelaciones.length} {cancelaciones.length !== 1 ? ' Cancelaciones' : ' Cancelación'}
                  </Typography>
                  {cancelacionesExpanded[solicitud.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
                          Devuelto:
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
          <ListAltIcon sx={{ fontSize: '2rem' }} />
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
      {/* Diálogo Unificado de Cancelación de Días */}
      <Dialog 
        open={dialogoCancelacionDias} 
        onClose={() => !procesandoCancelacion && setDialogoCancelacionDias(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle display='flex' justifyContent='center' bgcolor='error.main' color='white'>
          {solicitudACancelar?.estado === 'pendiente' 
            ? 'Eliminar Solicitud' 
            : solicitudACancelar?.esVenta 
              ? 'Cancelar Venta de Vacaciones'
              : 'Cancelar Días de Vacaciones'}
        </DialogTitle>
        
        <DialogContent>
          {solicitudACancelar && (
            <>
              {/* Info de la solicitud */}
              <Alert severity="info" sx={{ my: 2 }}>
                {solicitudACancelar.estado === 'pendiente' ? (
                  'Esta solicitud aún está pendiente de aprobación. Se devolverán las horas pendientes al saldo.'
                ) : solicitudACancelar.esVenta ? (
                  'Se cancelará la venta de vacaciones y se devolverán las horas a tu saldo.'
                ) : (
                  'Selecciona los días que deseas cancelar. Las horas correspondientes se devolverán a tu saldo disponible.'
                )}
              </Alert>

              {/* Selector de días - solo para vacaciones aprobadas */}
              {solicitudACancelar.estado === 'aprobada' && !solicitudACancelar.esVenta && (
                <Box sx={{ mb: 3 }}>
                  <SelectorDiasCancelacion
                    solicitud={solicitudACancelar}
                    onDiasSeleccionados={setDiasACancelar}
                    diasSeleccionados={diasACancelar}
                    esAdmin={false}
                  />
                </Box>
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

        <DialogActions sx={{display:'flex', justifyContent:'space-between', p:2}}>
          <Button 
            variant='outlined'
            onClick={() => setDialogoCancelacionDias(false)} 
            disabled={procesandoCancelacion}
            sx={{
              fontSize:'1.1rem',
              px:2,
              py:1
            }}
          >
            Volver
          </Button>
          <Button
            onClick={handleConfirmarCancelacionDias}
            variant="contained"
            color="error"
            disabled={procesandoCancelacion || !motivoCancelacion.trim()}
            startIcon={procesandoCancelacion?<CircularProgress size={20} />:solicitudACancelar?.estado === 'pendiente'?<DeleteForeverIcon/>:<ClearIcon/>}
            sx={{
              fontSize:'1.1rem',
              px:2,
              py:1
            }}
          >
            {procesandoCancelacion 
              ? 'Procesando...' 
              : solicitudACancelar?.estado === 'pendiente' 
                ? 'Eliminar' 
                : 'Cancelar'}
          </Button>
        </DialogActions>
      </Dialog>
   
    </>
  );
};

export default MisSolicitudesVacaciones;
