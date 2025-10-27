// components/Ausencias/MisAusencias.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Chip, Grid, Tabs, Tab, Fab, Dialog, Collapse,
  DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  EventBusyOutlined as EventBusyOutlinedIcon,
  DynamicFeedOutlined as DynamicFeedOutlinedIcon,
  Add as AddIcon,
  EditOutlined as EditIcon,
  CancelOutlined as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useAusenciasStore } from '../../stores/ausenciasStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearFechaCorta, ordenarFechas, esFechaPasadaOHoy, formatearFechaLarga } from '../../utils/dateUtils';

const MisAusencias = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    ausencias,
    loadAusencias,
    cancelarAusencia,
    loading
  } = useAusenciasStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [tabActual, setTabActual] = useState(0);
  const [ausenciaExpandida, setAusenciaExpandida] = useState(null);

  // Estados para cancelación
  const [dialogoCancelacion, setDialogoCancelacion] = useState(false);
  const [ausenciaACancelar, setAusenciaACancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = loadAusencias(user?.email);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.email, loadAusencias]);

  const puedeGestionarAusencia = (ausencia) => {
    const diasDisponibles = ausencia.fechas.filter(fecha => !esFechaPasadaOHoy(fecha));

    return {
      puedeEditar: ausencia.estado === 'pendiente',
      puedeCancelar: ausencia.estado === 'pendiente' || (ausencia.estado === 'aprobado' && diasDisponibles.length > 0),
      diasDisponibles: diasDisponibles.length
    };
  };

  // Filtrar ausencias por estado
  const ausenciasPendientes = ausencias.filter(a => a.estado === 'pendiente');
  const ausenciasAprobadas = ausencias.filter(a => a.estado === 'aprobado');
  const ausenciasRechazadas = ausencias.filter(a => a.estado === 'rechazado');
  const ausenciasCanceladas = ausencias.filter(a => a.estado === 'cancelado');

  // Función para abrir diálogo de cancelación
  const handleAbrirCancelacion = (ausencia) => {
    setAusenciaACancelar(ausencia);
    setMotivoCancelacion('');
    setDialogoCancelacion(true);
  };

  // Función para confirmar cancelación
  const handleConfirmarCancelacion = async () => {
    if (!motivoCancelacion.trim()) {
      showError('Debes escribir un motivo para cancelar la ausencia');
      return;
    }

    setCancelando(true);
    try {
      await cancelarAusencia(ausenciaACancelar, motivoCancelacion, false);
      
      const tipoTexto = ausenciaACancelar.tipo === 'baja' ? 'Baja' : 'Permiso';
      showSuccess(`${tipoTexto} cancelado correctamente`);
      
      setDialogoCancelacion(false);
      setAusenciaACancelar(null);
      setMotivoCancelacion('');
    } catch (error) {
      showError('Error al cancelar la ausencia: ' + error.message);
    } finally {
      setCancelando(false);
    }
  };

  const handleEditarAusencia = (ausencia) => {
    // Verificar si se puede editar (solo pendientes y fechas futuras)
    const primeraFecha = ausencia.fechas[0];
    const esFechaFutura = !esFechaPasadaOHoy(primeraFecha);

    if (!esFechaFutura) {
      showError('No puedes editar ausencias con fechas pasadas');
      return;
    }

    navigate(`/ausencias/editar/${ausencia.id}`);
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
    const { puedeEditar, puedeCancelar, diasDisponibles } = puedeGestionarAusencia(ausencia);
    const colorEstado = getColorEstado(ausencia.estado);
    const colorTipo = getColorTipo(ausencia.tipo);

    return (
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* Cabecera con estado y tipo */}
            <Grid size={{ xs: 12 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Chip
                  label={ausencia.estado.toUpperCase()}
                  sx={colorEstado}
                  size="small"
                />
                <Chip
                  label={ausencia.tipo === 'baja' ? '🔴 BAJA' : '🟣 PERMISO'}
                  color={colorTipo}
                  variant="outlined"
                  size="small"
                />
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

              {ausencia.fechaEdicion && (
                <Typography variant="body1" color='primary.main' display="block">
                  Modificada: {formatearFechaCorta(ausencia.fechaEdicion)}
                </Typography>
              )}

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

              {ausencia.fechaCancelacion && (
                <Typography variant="body1" color="warning.main" display="block">
                  ⚠️ Cancelada: {formatearFechaCorta(ausencia.fechaCancelacion)}
                </Typography>
              )}
            </Grid>

            {/* Duración */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="body1" fontWeight={600}>
                Días solicitados: {ausencia.fechas.length} día{ausencia.fechas.length !== 1 ? 's' : ''}
              </Typography>
            </Grid>

            {/* Lista de fechas */}
            <Grid size={{ xs: 12 }}>
              {ausencia.fechas.length === 1 ? (
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: `${colorEstado.fondo}.fondo`,
                    borderRadius: 2,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="body1" fontWeight={600}>
                    {formatearFechaLarga(ausencia.fechas[0])}
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    onClick={() => setAusenciaExpandida(ausenciaExpandida === ausencia.id ? null : ausencia.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      p: 1.5,
                      bgcolor: `${colorEstado.fondo}.fondo`,
                      borderRadius: 2,
                      '&:hover': { bgcolor: `${colorEstado.fondo}.fondoFuerte` },
                    }}
                  >
                    <Typography variant="body1" fontWeight={600}>
                      Fechas de la ausencia
                    </Typography>
                    {ausenciaExpandida === ausencia.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                  <Collapse in={ausenciaExpandida === ausencia.id}>
                    <Grid container sx={{ mt: 1, pl: 2 }}>
                      {ordenarFechas(ausencia.fechas).map(fecha => {
                        const esPasada = esFechaPasadaOHoy(fecha);
                        return (
                          <Grid size={{xs:6, md:4}} key={fecha}>
                            <Typography
                                variant="body1"
                                color={esPasada ? 'text.disabled' : 'text.primary'}
                                sx={{ textDecoration: esPasada ? 'line-through' : 'none' }}
                            >
                                • {formatearFechaCorta(fecha)}
                            </Typography>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Collapse>
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
                <Box sx={{ p: 1.5, bgcolor: '#e3f2fd', borderRadius: 2, borderLeft: '3px solid #2196F3' }}>
                  <Typography variant="body1" color="primary" fontStyle='italic' display="block" fontWeight={600}>
                    👨‍💼 Respuesta del administrador:
                  </Typography>
                  <Typography variant="body1">
                    {ausencia.comentariosAdmin}
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Motivo de cancelación */}
            {ausencia.motivoCancelacion && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ p: 1.5, bgcolor: '#fff3e0', borderRadius: 2, borderLeft: '3px solid #FF9800' }}>
                  <Typography variant="body1" color="warning.main" display="block" fontWeight={600}>
                    ⚠️ Motivo de cancelación:
                  </Typography>
                  <Typography variant="body1">
                    {ausencia.motivoCancelacion}
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Acciones */}
            <Grid size={{ xs: 12 }}>
              <Box display="flex" gap={1} justifyContent="space-between" flexWrap="nowrap" sx={{mt:1}}>
                {/* Editar - solo pendientes */}
                {puedeEditar && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditarAusencia(ausencia)}
                    sx={{
                      fontSize:'1.1rem',
                      color: "azul.main",
                      borderColor: 'azul.main',
                      '&:hover': { bgcolor: 'azul.fondo', borderColor: 'azul.main', transform: 'scale(1.05)' },
                      transition: 'all 0.2s ease',
                      textTransform: 'none'
                    }}
                  >
                    Editar
                  </Button>
                )}

                {/* Cancelar - pendientes o aprobadas con días futuros */}
                {puedeCancelar && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={() => handleAbrirCancelacion(ausencia)}
                    sx={{
                      fontSize:'1.1rem',
                      color: "rojo.main",
                      borderColor: 'rojo.main',
                      '&:hover': { bgcolor: 'rojo.fondo', borderColor: 'rojo.main', transform: 'scale(1.05)' },
                      transition: 'all 0.2s ease',
                      textTransform: 'none'
                    }}
                    title={ausencia.estado === 'pendiente' ? 'Eliminar solicitud' : 'Cancelar ausencia'}
                  >
                    {ausencia.estado === 'pendiente' ? 'Eliminar' : 'Cancelar'}
                  </Button>
                )}
              </Box>
            </Grid>
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


      {/* Diálogo de cancelación */}
      <Dialog
        open={dialogoCancelacion}
        onClose={() => !cancelando && setDialogoCancelacion(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{mb:2, bgcolor:ausenciaACancelar?.estado === 'pendiente' ? 'rojo.main' : 'naranja.main'}}>
          <Typography textAlign='center' fontSize='1.5rem' color='white'>
          {ausenciaACancelar?.estado === 'pendiente' ? 'Eliminar solicitud' : 'Cancelar ausencia'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" mb={2} textAlign='center'>
            {ausenciaACancelar?.estado === 'pendiente'
              ? `Vas a eliminar esta solicitud de ${ausenciaACancelar?.tipo}. Esta acción es irreversible. ¿Estás seguro?`
              : `Vas a cancelar esta solicitud de ${ausenciaACancelar?.tipo} ya ${ausenciaACancelar?.estado}. Explica brevemente el motivo.`
            }
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo de cancelación"
            value={motivoCancelacion}
            onChange={(e) => setMotivoCancelacion(e.target.value)}
            placeholder="Ej: Error en las fechas, cambio de planes..."
            disabled={cancelando}
            required
          />
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between',p:2, mt:-2}}>
          <Button
            onClick={() => setDialogoCancelacion(false)}
            disabled={cancelando}
            color="primary"
            variant="outlined"
            sx={{ textTransform: 'none', px: 2, py: 1.5 }}
          >
            Cerrar
          </Button>
          <Button
            onClick={handleConfirmarCancelacion}
            disabled={cancelando || !motivoCancelacion.trim()}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none', px: 2, py: 1.5 }}
            startIcon={cancelando ? <CircularProgress size={20} color="inherit" /> : <CancelIcon />}
          >
            {ausenciaACancelar?.estado === 'pendiente'
              ? (cancelando ? 'Eliminando...' : 'Eliminar')
              : (cancelando ? 'Cancelando...' : 'Cancelar')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MisAusencias;
