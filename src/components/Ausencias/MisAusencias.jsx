// components/Ausencias/MisAusencias.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar, Popover, Alert,
  IconButton, Chip, Grid, Tabs, Tab, Fab, Dialog, Collapse, Menu, MenuItem, ListItemIcon, ListItemText,
  DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress,
  Divider
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  EventBusyOutlined as EventBusyOutlinedIcon,
  DynamicFeedOutlined as DynamicFeedOutlinedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AddCircleOutline as AddIcon,     
  DeleteOutline as DeleteIcon,       
  CancelOutlined as CancelIcon,
  MoreVert as MoreVertIcon,
  SelectAll as SelectAllIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useAusenciasStore } from '../../stores/ausenciasStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearFechaCorta, ordenarFechas, esFechaPasadaOHoy, formatearFechaLarga } from '../../utils/dateUtils';
import { capitalizeFirstLetter } from '../Helpers';

const MisAusencias = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    obtenerDiasAgregados,
    obtenerDiasCancelados,
    obtenerDiasDisponiblesParaCancelar,
    ausencias,
    cancelarDiasAusencia,
    loadAusencias,
    eliminarAusencia,
    loading,
    calcularEstadoRealFechas
  } = useAusenciasStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [tabActual, setTabActual] = useState(0);
  const [ausenciaExpandida, setAusenciaExpandida] = useState({});
  
  // Estados para cancelación
  const [dialogoCancelacion, setDialogoCancelacion] = useState(false);
  const [ausenciaACancelar, setAusenciaACancelar] = useState(null);
  const [diasACancelar, setDiasACancelar] = useState([]); 
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [cancelacionesExpanded, setCancelacionesExpanded] = useState({});

  // Estados para eliminación
  const [dialogoEliminacion, setDialogoEliminacion] = useState(false);
  const [ausenciaAEliminar, setAusenciaAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = loadAusencias(user?.email);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.email, loadAusencias]);

  const puedeGestionarAusencia = (ausencia) => {
    const diasDisponibles = ausencia.fechasActuales.filter(fecha => !esFechaPasadaOHoy(fecha));
    const tieneDiasPasados = ausencia.fechasActuales.some(f => esFechaPasadaOHoy(f));
    
    return {
      puedeAñadir: (ausencia.estado === 'pendiente' || ausencia.estado === 'aprobado'),
      puedeCancelar: (ausencia.estado === 'pendiente' || ausencia.estado === 'aprobado') && diasDisponibles.length > 0,
      puedeEliminar: (ausencia.estado === 'pendiente' || ausencia.estado === 'aprobado') && !tieneDiasPasados,
      diasDisponibles: diasDisponibles.length
    };
  };


  // Filtrar ausencias por estado
  const ausenciasPendientes = ausencias.filter(a => a.estado === 'pendiente');
  const ausenciasAprobadas = ausencias.filter(a => a.estado === 'aprobado');
  const ausenciasRechazadas = ausencias.filter(a => a.estado === 'rechazado');
  const ausenciasCanceladas = ausencias.filter(a => a.estado === 'cancelado');

 // Abrir diálogo de cancelación (con selector de días)
  const handleAbrirCancelacion = (ausencia) => {
    setAusenciaACancelar(ausencia);
    setDiasACancelar([]);
    setMotivoCancelacion('');
    setDialogoCancelacion(true);
  };

  // Confirmar cancelación de días
  const handleConfirmarCancelacion = async () => {
    if (!motivoCancelacion.trim()) {
      showError('Debes escribir un motivo para cancelar');
      return;
    }

    if (diasACancelar.length === 0) {
      showError('Debes seleccionar al menos un día para cancelar');
      return;
    }

    setCancelando(true);
    try {
      await cancelarDiasAusencia(
        ausenciaACancelar.id,
        diasACancelar,
        motivoCancelacion,
        ausenciaACancelar,
        false //es admin
      );

      const tipoTexto = ausenciaACancelar.tipo === 'baja' ? 'Baja' : 'Permiso';
      const diasDisponibles = obtenerDiasDisponiblesParaCancelar(ausenciaACancelar);
      const esCancelacionTotal = diasACancelar.length === diasDisponibles.length;

      showSuccess(
        esCancelacionTotal
          ? `${tipoTexto} cancelado completamente`
          : `${diasACancelar.length} día(s) cancelado(s) correctamente`
      );

      setDialogoCancelacion(false);
      setAusenciaACancelar(null);
      setDiasACancelar([]);
      setMotivoCancelacion('');
    } catch (error) {
      showError('Error al cancelar: ' + error.message);
    } finally {
      setCancelando(false);
    }
  };

  // Abrir diálogo de eliminación
  const handleAbrirEliminacion = (ausencia) => {
    setAusenciaAEliminar(ausencia);
    setDialogoEliminacion(true);
  };

  // Confirmar eliminación
  const handleConfirmarEliminacion = async () => {
    setEliminando(true);
    try {
      await eliminarAusencia(ausenciaAEliminar.id, ausenciaAEliminar);

      const tipoTexto = ausenciaAEliminar.tipo === 'baja' ? 'Baja' : 'Permiso';
      showSuccess(`${tipoTexto} eliminado correctamente`);

      setDialogoEliminacion(false);
      setAusenciaAEliminar(null);
    } catch (error) {
      showError('Error al eliminar: ' + error.message);
    } finally {
      setEliminando(false);
    }
  };

  // Navegar a añadir días
  const handleAñadirDias = (ausencia) => {
    navigate(`/ausencias/agregarDias/${ausencia.id}`);
  };

  // Acciones desde el menú
  const handleAccionMenu = (accion, ausencia) => {

    switch (accion) {
      case 'añadir':
        handleAñadirDias(ausencia);
        break;
      case 'cancelar':
        handleAbrirCancelacion(ausencia);
        break;
      case 'eliminar':
        handleAbrirEliminacion(ausencia);
        break;
      default:
        break;
    }
  };

    const toggleAusenciaExpanded = (ausenciaId) => {
    setAusenciaExpandida(prev => ({
      ...prev,
      [ausenciaId]: !prev[ausenciaId]
    }));
  };

  // Toggle para acordeón de cancelaciones parciales
  const toggleCancelacionesExpanded = (ausenciaId) => {
    setCancelacionesExpanded(prev => ({
      ...prev,
      [ausenciaId]: !prev[ausenciaId]
    }));
  };


  const getColorEstado = (estado) => {
    switch (estado) {
      case 'pendiente': return { fondo: 'azul', color: 'white', bgcolor: 'azul.main' };
      case 'aprobado': return { fondo: 'verde', color: 'white', bgcolor: 'verde.main' };
      case 'rechazado': return { fondo: 'rojo', color: 'white', bgcolor: 'rojo.main' };
      case 'cancelado': return { fondo: 'dorado', color: 'white', bgcolor: 'dorado.main' };
      default: return { fondo: 'grey', color: 'text.secondary', bgcolor: 'grey.100' };
    }
  };

  const getColorTipo = (tipo) => {
    return tipo === 'baja' ? 'error' : 'purpura'; // rojo para baja, morado para permiso
  };

  const AusenciaCard = ({ ausencia }) => {
    const { puedeAñadir, puedeCancelar, puedeEliminar } = puedeGestionarAusencia(ausencia);
    const colorEstado = getColorEstado(ausencia.estado);
    const colorTipo = getColorTipo(ausencia.tipo);
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
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={1}>
            {/* Cabecera con estado y tipo */}       
            <Grid size={{ xs: 12 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Chip
                  label={ausencia.tipo === 'baja' ? '🔴 BAJA' : '🟣 PERMISO'}
                  color={colorTipo}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={ausencia.estado.toUpperCase()}
                  sx={colorEstado}
                  size="small"
                />
                {/* Menú de 3 puntos (solo si hay acciones disponibles) */}
                {(puedeAñadir || puedeCancelar || puedeEliminar) && (
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
                                {puedeAñadir && (
                  <MenuItem onClick={() => handleAccionMenu('añadir', ausencia)}>
                    <ListItemIcon>
                      <AddIcon fontSize="small" sx={{ color: 'success.main' }} />
                    </ListItemIcon>
                    <ListItemText primary="Añadir días" />
                  </MenuItem>
                )}
                {puedeCancelar && (
                  <MenuItem onClick={() => handleAccionMenu('cancelar', ausencia)}>
                    <ListItemIcon>
                      <CancelIcon fontSize="small" sx={{ color: 'warning.main' }} />
                    </ListItemIcon>
                    <ListItemText primary="Cancelar días" />
                  </MenuItem>
                )}
                {puedeEliminar && (
                  <MenuItem onClick={() => handleAccionMenu('eliminar', ausencia)}>
                    <ListItemIcon>
                      <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
                    </ListItemIcon>
                    <ListItemText primary={'Eliminar '+ capitalizeFirstLetter(ausencia.tipo)} />
                  </MenuItem>
                )}
              </Menu>
                </>
                )}
              </Box>
            </Grid>

            {/* Información principal */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" fontWeight={600} color={colorTipo}>
                {ausencia.motivo}
              </Typography>
            </Grid>

            {/* Fechas importantes */}
                <Grid size={{ xs: 12 }}>
              <Typography variant="body1"  display="block">
                Solicitada: {formatearFechaCorta(ausencia.fechaSolicitud)}
              </Typography>

              {ausencia.estado === 'aprobado' && (
                <Typography variant="body1" color="success.main" display="block">
                  ✅ Aprobada: {formatearFechaCorta(ausencia.fechaAprobacionDenegacion)}
                </Typography>
              )}

              {ausencia.estado === 'rechazado' && (
                <Typography variant="body1" color="error.main" display="block">
                  ❌ Rechazada: {formatearFechaCorta(ausencia.fechaAprobacionDenegacion)}
                </Typography>
              )}

              {ausencia.estado==='cancelado' && (
                <Typography variant="body1" color="warning.main" display="block">
                  ⚠️ Cancelada: {formatearFechaCorta(ausencia.cancelaciones[ausencia.cancelaciones.length-1].fechaCancelacion)}
                </Typography>
              )}
            </Grid>


              {/* Duración */}
              <Grid size={{ xs: 12 }}>
              <Box
                onClick={() => toggleAusenciaExpanded(ausencia.id)}
                sx={{
                  
                  width:'100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:'space-between',
                  cursor: 'pointer',         
                }}
              >
              <Typography variant="body1" fontWeight={600}>
                Días de {capitalizeFirstLetter(ausencia.tipo)}: {ausencia.fechasActuales.length} día{ausencia.fechasActuales.length !== 1 ? 's' : ''}
              </Typography>
              {ausenciaExpandida[ausencia.id] ? <ExpandLessIcon sx={{fontSize:'2rem'}} /> : <ExpandMoreIcon sx={{fontSize:'2rem'}}/>}
              </Box>
            </Grid>

            <Collapse in={ausenciaExpandida[ausencia.id]}> 
            {/* Lista de fechas */}
            <Grid size={{ xs: 12 }}>
              {(ausencia.fechas.length === 1 && ausencia.fechasActuales.length<=1) ? (
                <Box
                  sx={{
                    p: 1.5,
                    border:'2px solid',
                    borderColor: `${colorEstado.bgcolor}`,
                    borderRadius: 2,
                    textAlign: 'center'
                  }}
                >
                <Typography fontSize={'1.15rem'} 
                  sx={{textDecoration:ausencia.fechasActuales.length===0?'line-through':'none',
                    color:ausencia.fechasActuales.length===0?'error.main':''
                  }}>
                    {ausencia.fechasActuales.length===0?'❌ ':''}{formatearFechaLarga(ausencia.fechasActuales.length===1?ausencia.fechasActuales[0]:ausencia.fechas[0])}
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      p: 1,
                      border:'2px solid',
                      borderColor: `${colorEstado.fondo}.main`,
                      borderRadius: 3,
                    }}
                  >
                    <Typography fontSize={'1.15rem'} fontWeight={600}>
                      Fechas de la ausencia
                    </Typography>
                  </Box>
                    <Grid container sx={{ my: 1 }} spacing={0.5}>
                      {/* Obtener listas para clasificar */}
                      {(() => {
                        // Calcular el estado real de las fechas considerando el orden temporal
                        const { canceladas, agregadas } = calcularEstadoRealFechas(ausencia);
                        
                        // Obtener TODAS las fechas que se añadieron en algún momento
                        const todasLasFechasAgregadas = obtenerDiasAgregados(ausencia.ediciones || []);
                        
                        // Todas las fechas únicas = originales + todas las agregadas (estén canceladas o no)
                        const todasLasFechas = [...new Set([...ausencia.fechas, ...todasLasFechasAgregadas])];


                      return ordenarFechas(todasLasFechas).map(fecha => {
                        const esPasada = esFechaPasadaOHoy(fecha);
                        const esAgregada = agregadas.includes(fecha);
                        const estaCancelada = canceladas.includes(fecha);
                        
                        // Determinar estilo y etiqueta según el estado REAL
                        let colorTexto = esPasada?'text.secondary':'text.primary'
                        let etiqueta = '';
                        let decoracion = 'none';
                        let icono = '•';
                        
                        if (estaCancelada) {
                          // Fecha cancelada y NO reactivada
                          colorTexto = 'error.main';
                          decoracion = 'line-through';
                          etiqueta = '(Cancelado)';
                          icono = '❌ ';
                        } else if (esAgregada) {
                          // Fecha añadida (puede ser nueva o reactivada)
                          colorTexto = 'success.main';
                          etiqueta = '(Añadido)';
                          icono = '➕ ';
                        }  else if (esPasada) {
                           // Fecha disfrutada
                          colorTexto = 'text.secondary';
                          decoracion = 'none';
                          etiqueta = '(Disfrutado)';
                          icono = '✅ ';
                        }
                          return (
                            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={fecha}>
                              <Box display="flex" justifyContent='center' alignItems="center">
                                <Typography variant="body1"color={colorTexto}>
                                  {icono}
                                </Typography>
                                <Typography
                                  variant="body1"
                                  color={colorTexto}
                                  sx={{ 
                                    textDecoration: decoracion,
                                    fontStyle: esPasada? 'italic': 'normal',
                                    fontWeight: esAgregada ? 600 : 400
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
                          );
                        });
                      })()}
                    </Grid>
                    {ausencia?.ediciones || ausencia?.cancelaciones && (
                      <>
                      <Divider sx={{bgcolor:'black', mt:1}} />
                      <Grid container sx={{ mt: 1, pl: 2 }} spacing={0.5}>
                      <Grid size={{xs:6,md:4}} display="flex" alignItems="center">
                        <Typography variant="caption" color="text.primary">• Fecha original</Typography>
                      </Grid>
                      <Grid size={{xs:6,md:4}} display="flex" alignItems="center">
                        <Typography variant="caption" color="text.secondary" fontStyle='italic'>Fecha Pasada</Typography>
                      </Grid>
                      <Grid size={{xs:6,md:4}} display="flex" alignItems="center">
                        <Typography variant="caption" color="success.main">➕ Añadido</Typography>
                      </Grid>
                      <Grid size={{xs:6,md:4}} display="flex" alignItems="center">
                        <Typography variant="caption" color="error.main">❌ Cancelado</Typography>
                      </Grid>
                      </Grid>
                      </>
                      )}

                </>
              )}
            </Grid>

            {/* Comentarios del solicitante */}
            {ausencia.comentariosSolicitante && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ p: 1.5, bgcolor: '#f5f5f5', borderRadius: 2, borderLeft: `3px solid ${ausencia.tipo==="baja"?'red':'purple'}` }}>
                  <Typography variant="body1" display="block" fontWeight={600}>
                    💬 Tus comentarios:
                  </Typography>
                  <Typography variant="body1">
                    "{ausencia.comentariosSolicitante}"
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Respuesta del admin */}
            {ausencia.comentariosAdmin && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ mt:1, p: 1.5, bgcolor: '#e3f2fd', borderRadius: 2, borderLeft: '3px solid #2196F3' }}>
                  <Typography variant="body1" color="primary" fontStyle='italic' display="block" fontWeight={600}>
                    👨‍💼 Respuesta de administración:
                  </Typography>
                  <Typography variant="body1">
                    {ausencia.comentariosAdmin}
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Historial de ediciones (días añadidos) */}
            {ausencia.ediciones && ausencia.ediciones.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Divider sx={{mt:1,  mb: 2, bgcolor: 'black' }} />
                
                <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '1rem' }}>
                  ➕ Días añadidos: {obtenerDiasAgregados(ausencia.ediciones).length} {obtenerDiasAgregados(ausencia.ediciones).length === 1 ? 'día' : 'días'}
                </Typography>

                <Box
                  onClick={() => toggleCancelacionesExpanded(`ediciones-${ausencia.id}`)}
                  sx={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    bgcolor: 'success.lighter',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'success.main',
                    '&:hover': { bgcolor: 'success.light' }
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="success.dark">
                    {ausencia.ediciones.length} {ausencia.ediciones.length !== 1 ? ' Extensiones' : ' Extensión'}
                  </Typography>
                  {cancelacionesExpanded[`ediciones-${ausencia.id}`] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>

                <Collapse in={cancelacionesExpanded[`ediciones-${ausencia.id}`]}>
                  <Box sx={{ mt: 2 }}>
                    {ausencia.ediciones.map((edicion, index) => (
                      <Card
                        key={index}
                        elevation={0}
                        sx={{
                          p: 2,
                          mb: 1,
                          bgcolor: '#e8f5e9',
                          borderLeft: '4px solid',
                          borderColor: 'success.main'
                        }}
                      >
                        <Typography variant="body2" fontWeight={700} sx={{ mb: 1, color: 'success.dark' }}>
                          Extensión #{index + 1}
                        </Typography>

                        {/* Fecha de edición */}
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Typography variant="body2" color="">
                            Añadido el:
                          </Typography>
                          <Typography variant="body1" fontWeight={600}>
                            {formatearFechaCorta(edicion.fechaEdicion)}
                          </Typography>
                        </Box>

                        {/* Días añadidos */}
                        <Box mb={1}>
                          <Typography variant="body2" color="" display="block" mb={0.5}>
                            Días añadidos ({edicion.fechasAgregadas.length}):
                          </Typography>
                          <Grid container sx={{ display: 'flex' }}>
                            {edicion.fechasAgregadas.map(fecha => (
                              <Grid size={{xs:4,md:3}} key={fecha}>
                              <Chip
                                label={formatearFechaCorta(fecha)}
                                size="small"
                                variant='outlined'
                                sx={{
                                  fontSize: '0.75rem',
                                  mb: 0.5,
                                  color: 'success.main',
                                  bgcolor: 'white',
                                  bordercolor: 'success.main',
                                  fontWeight: 600
                                }}
                              />
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        {/* Motivo */}
                        {edicion.motivoEdicion && (
                          <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1, border: '1px dashed', borderColor: 'success.main' }}>
                            <Typography variant="body2" color="" fontWeight={600} display="block">
                              💬 Motivo:
                            </Typography>
                            <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                              "{edicion.motivoEdicion}"
                            </Typography>
                          </Box>
                        )}

                        {/* Quién editó */}
                        <Box mt={1}>
                          <Typography variant="body2" color="">
                            Días añadidos por: <strong>{edicion.editadoPor}</strong>
                          </Typography>
                        </Box>
                      </Card>
                    ))}
                  </Box>
                </Collapse>
              </Grid>
            )}


            {/* Historial de cancelaciones parciales */}
            {ausencia.cancelaciones && ausencia.cancelaciones.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2, bgcolor: 'black' }} />
                
                <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '1rem' }}>
                  ❌ Días Cancelados: {obtenerDiasCancelados(ausencia.cancelaciones).length} {obtenerDiasCancelados(ausencia.cancelaciones).length === 1 ? 'día' : 'días'}
                </Typography>

                <Box
                  onClick={() => toggleCancelacionesExpanded(ausencia.id)}
                  sx={{
                    mb:1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    bgcolor:'warning.lighter',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'warning.main',
                    '&:hover': { bgcolor: 'warning.light' }
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="warning.dark">
                    {ausencia.cancelaciones.length} {ausencia.cancelaciones.length !== 1 ? ' Cancelaciones' : ' Cancelación'}
                  </Typography>
                  {cancelacionesExpanded[ausencia.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>

                <Collapse in={cancelacionesExpanded[ausencia.id]}>
                  <Box sx={{ mt: 1 }}>
                    {ausencia.cancelaciones.map((cancelacion, index) => (
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
                        <Typography variant="body2" fontWeight={700} sx={{ mb: 1, color: cancelacion.esCancelacionTotal?'error.dark':'warning.dark' }}>
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
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Typography variant="body2" color="">
                            Cancelado el:
                          </Typography>
                          <Typography variant="body1" fontWeight={600}>
                            {formatearFechaCorta(cancelacion.fechaCancelacion)}
                          </Typography>
                        </Box>

                        {/* Días cancelados */}
                        <Box mb={1.5}>
                          <Typography variant="body2" color="" display="block" mb={0.5}>
                            Días cancelados ({cancelacion.diasCancelados.length}):
                          </Typography>
                          < Grid container sx={{ display: 'flex' }}>
                            {cancelacion.diasCancelados.map(fecha => (
                              <Grid size={{xs:4,md:3}} key={fecha}>
                              <Chip                             
                                label={formatearFechaCorta(fecha)}
                                size="small"
                                variant='outlined'
                                sx={{
                                  fontSize: '0.75rem',
                                  mb: 0.5,
                                  bgcolor: 'white',
                                  color: cancelacion.esCancelacionTotal?'error.main':'warning.main',
                                  bordercolor: cancelacion.esCancelacionTotal?'error.main':'warning.main',
                                  fontWeight: 600
                                }}
                              />
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        {/* Motivo */}
                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1, border: '1px dashed', borderColor: 'warning.main' }}>
                          <Typography variant="body2" color="" fontWeight={600} display="block">
                            💬 Motivo:
                          </Typography>
                          <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                            "{cancelacion.motivoCancelacion}"
                          </Typography>
                        </Box>

                        {/* Quién canceló */}
                        <Box mt={1}>
                          <Typography variant="body2" color="">
                            Cancelado por:<br/><strong>{cancelacion.canceladoPor}</strong>
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
        </CardContent>
      </Card>
    );
  };

  const renderAusencias = (ausencias) => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress size={40} sx={{ color: '#9C27B0' }} />
          <Typography variant="body1" ml={2}>
            Cargando ausencias...
          </Typography>
        </Box>
      );
    }

    if (ausencias.length === 0) {
      return (
        <Box textAlign="center" py={6}>
          <EventBusyOutlinedIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No hay ausencias en esta categoría
          </Typography>
        </Box>
      );
    }

    return ausencias.map(ausencia => (
      <AusenciaCard key={ausencia.id} ausencia={ausencia} />
    ));
  };

  return (
    <>
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
                 onClick={() => navigate('/ausencias')}
                 sx={{
                   bgcolor: 'rgba(255,255,255,0.1)',
                   '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' },
                   transition: 'all .3s ease'
                 }}>
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
                 >Mis Ausencias
                </Typography>
                      <Typography 
                          variant="caption" 
                          sx={{ 
                          opacity: 0.9,
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                          }}
                      >
                        Gestiona tus Permisos y Bajas
                      </Typography>
                    </Box>
                    <DynamicFeedOutlinedIcon sx={{ fontSize: '2rem' }} />
                  </Toolbar>
                </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Tabs */}
        <Grid container spacing={1} mb={3}>
          {[
            { label: 'Aprobadas', count: ausenciasAprobadas.length, color: 'verde' },
            { label: 'Pendientes', count: ausenciasPendientes.length, color: 'azul' },
            { label: 'Rechazadas', count: ausenciasRechazadas.length, color: 'rojo' },
            { label: 'Canceladas', count: ausenciasCanceladas.length, color: 'dorado' },
          ].map((tab, index) => (
            <Grid size={{ xs: 6, sm: 3 }} key={index}>
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
                  borderColor: tabActual === index ? '' : 'grey.400',
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
        {tabActual === 0 && renderAusencias(ausenciasAprobadas)}
        {tabActual === 1 && renderAusencias(ausenciasPendientes)}
        {tabActual === 2 && renderAusencias(ausenciasRechazadas)}
        {tabActual === 3 && renderAusencias(ausenciasCanceladas)}
      </Container>


      {/* Diálogo de cancelación con selector de días */}
      <Dialog
        open={dialogoCancelacion && ausenciaACancelar !== null}
        onClose={() => !cancelando && setDialogoCancelacion(false)}
        maxWidth="sm"
        fullWidth
        
      >
        <DialogTitle sx={{color:'warning.main', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem'}}>
          ⚠️ Cancelar días {ausenciaACancelar?.tipo === 'baja' ? 'de la baja' : 'del permiso'}
        </DialogTitle>
        <DialogContent >
          {ausenciaACancelar && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography fontSize='0.95rem' fontWeight={600}>
                  {ausenciaACancelar.tipo === 'baja' ? 'Baja' : 'Permiso'}: {ausenciaACancelar.motivo}
                </Typography>
                <Typography fontSize='0.8rem' display="block">
                  Días disponibles para cancelar: {obtenerDiasDisponiblesParaCancelar(ausenciaACancelar).length}
                </Typography>
              </Alert>

              {/* Selector de días */}
              <Typography textAlign='center' variant="body1" fontWeight={600} mb={0.5}>
                Selecciona los días a cancelar
              </Typography>
              
              <Grid container sx={{ 
                maxHeight: 200, 
                overflowY: 'auto', 
                border: '1px solid #e0e0e0', 
                borderRadius: 2, 
                p: 1.5,
                mb: 2 
              }}>
                {obtenerDiasDisponiblesParaCancelar(ausenciaACancelar).map(fecha => (
                  <Grid size={{xs:6, md:4}} 
                    key={fecha}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      p: 0.5,
                      '&:hover': { bgcolor: '#f5f5f5' },
                      borderRadius: 1
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={diasACancelar.includes(fecha)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDiasACancelar([...diasACancelar, fecha]);
                        } else {
                          setDiasACancelar(diasACancelar.filter(f => f !== fecha));
                        }
                      }}
                      style={{ marginRight: 8 }}
                    />
                    <Typography variant="body2">
                      {formatearFechaCorta(fecha)}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              {/* Botón seleccionar todos */}
              <Button
                size="small"
                variant="outlined"
                fullWidth
                onClick={() => {
                  const todosDias = obtenerDiasDisponiblesParaCancelar(ausenciaACancelar);
                  setDiasACancelar(
                    diasACancelar.length === todosDias.length ? [] : todosDias
                  );
                }}
                sx={{ mb: 2,p:1, fontSize:'1.1rem' }}
              >
                <SelectAllIcon sx={{mr:1.5, fontSize:'1.65rem'}}/>
                {diasACancelar.length === obtenerDiasDisponiblesParaCancelar(ausenciaACancelar).length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </Button>

              {/* Motivo */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Motivo de cancelación"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Ej: Ya me siento mejor, cambio de planes..."
                disabled={cancelando}
                required
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display:'flex', justifyContent:'space-between' }}>
          <Button
            onClick={() => setDialogoCancelacion(false)}
            disabled={cancelando}
            color="primary"
            variant="outlined"
            sx={{ textTransform: 'none', p: 1, fontSize:'1.1rem' }}
          >
            Volver
          </Button>
          <Button
            onClick={handleConfirmarCancelacion}
            disabled={cancelando || !motivoCancelacion.trim() || diasACancelar.length === 0}
            variant="contained"
            color="warning"
            sx={{ textTransform: 'none', p: 1,fontSize:'1.1rem' }}
            startIcon={cancelando ? <CircularProgress size={20} color="inherit" /> : <CancelIcon />}
          >
            {cancelando ? 'Cancelando...' : `Cancelar ${diasACancelar.length} ${diasACancelar.length===1 ? 'día':'días'} `}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Diálogo de eliminación */}
      <Dialog
        open={dialogoEliminacion && ausenciaAEliminar !== null}
        onClose={() => !eliminando && setDialogoEliminacion(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          🗑️ Eliminar {ausenciaAEliminar?.tipo === 'baja' ? 'baja' : 'permiso'}
        </DialogTitle>
        <DialogContent>
          {ausenciaAEliminar && (
            <Alert severity="error">
              <Typography variant="body2" mb={1}>
                ¿Estás seguro de que quieres <strong>eliminar permanentemente</strong> esta ausencia?
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {ausenciaAEliminar.tipo === 'baja' ? 'Baja' : 'Permiso'}: {ausenciaAEliminar.motivo}
              </Typography>
              <Typography variant="caption" display="block">
                {ausenciaAEliminar.fechasActuales.length} día(s) • {formatearFechaCorta(ausenciaAEliminar.fechasActuales[0])}
              </Typography>
              <Typography variant="body2" color="error" mt={1} fontStyle="italic">
                Esta acción no se puede deshacer.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDialogoEliminacion(false)}
            disabled={eliminando}
            color="primary"
            variant="outlined"
            sx={{ textTransform: 'none', px: 2, py: 1.5 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarEliminacion}
            disabled={eliminando}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none', px: 2, py: 1.5 }}
            startIcon={eliminando ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
          >
            {eliminando ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

    </>
  );
};

export default MisAusencias;
