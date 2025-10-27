// components/Admin/Ausencias/AusenciasPendientes.jsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Alert, Collapse, Grid,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  FilterList as FilterListIcon ,
  PendingActionsOutlined as PendingActionsOutlinedIcon,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  EventBusyOutlined as EventBusyOutlinedIcon,
  CheckCircleOutline as CheckIcon,
  CancelOutlined as RejectIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../../stores/authStore';
import { useAusenciasStore } from '../../../stores/ausenciasStore';
import { useUIStore } from '../../../stores/uiStore';
import { formatearFechaCorta, formatearFechaLarga, ordenarFechas } from '../../../utils/dateUtils';
import { formatearNombre } from '../../Helpers';

const AusenciasPendientes = () => {
  const navigate = useNavigate();
  const { isAdminOrOwner } = useAuthStore();
  const {
    ausencias,
    loadAusencias,
    cambiarEstadoAusencia,
    loading
  } = useAusenciasStore();
  const { showSuccess, showError } = useUIStore();
  const { obtenerDatosUsuarios } = useAuthStore();
  const { obtenerEmpleadosConAusencias, obtenerPuestosConAusencias } = useAusenciasStore();

  // Estados
  const [dialogoAccion, setDialogoAccion] = useState(false);
  const [ausenciaSeleccionada, setAusenciaSeleccionada] = useState(null);
  const [accionSeleccionada, setAccionSeleccionada] = useState(''); // 'aprobar' o 'rechazar'
  const [comentariosAdmin, setComentariosAdmin] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [ausenciaExpandida, setAusenciaExpandida] = useState(null);

    // Estados de filtros
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [datosUsuarios, setDatosUsuarios] = useState({});
    const [filtroEmpleado, setFiltroEmpleado] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('Todos'); // Todos, permiso, baja
    const [filtroPuesto, setFiltroPuesto] = useState('Todos');
    const [ordenPor, setOrdenPor] = useState('fechaSolicitud'); // fechaSolicitud, fechaAusencia


  useEffect(() => {
    if (!isAdminOrOwner()) {
        showError('No tienes permisos para acceder a esta sección');
        navigate('/');
        return;
    }

    return loadAusencias();
    }, [isAdminOrOwner, loadAusencias]);

    // Cargar datos de usuarios
    useEffect(() => {
    const cargarDatosUsuarios = async () => {
        const emails = [...new Set(ausencias.map(a => a.solicitante))];
        if (emails.length > 0) {
        const usuarios = await obtenerDatosUsuarios(emails);
        setDatosUsuarios(usuarios);
        }
    };

    if (ausencias.length > 0) {
        cargarDatosUsuarios();
    }
    }, [ausencias, obtenerDatosUsuarios]);

    // Obtener listas para filtros
    const empleadosDisponibles = useMemo(() => obtenerEmpleadosConAusencias(), [ausencias]);
    const puestosDisponibles = useMemo(() => obtenerPuestosConAusencias(), []);

    // Filtrar y ordenar ausencias
    const ausenciasPendientes = useMemo(() => {
    let pendientes = ausencias.filter(a => a.estado === 'pendiente');

    // Aplicar filtros
    if (filtroEmpleado) {
        pendientes = pendientes.filter(a => a.solicitante === filtroEmpleado);
    }

    if (filtroTipo !== 'Todos') {
        pendientes = pendientes.filter(a => a.tipo === filtroTipo.toLowerCase());
    }

    if (filtroPuesto !== 'Todos') {
        pendientes = pendientes.filter(a => {
        const userData = datosUsuarios[a.solicitante];
        return userData && userData.puesto === filtroPuesto;
        });
    }

    // Aplicar ordenación
    pendientes.sort((a, b) => {
        switch (ordenPor) {
        case 'fechaSolicitud':
        default:
            return new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud); // Más recientes primero
        case 'fechaAusencia':
            return new Date(a.fechas[0]) - new Date(b.fechas[0]); // Próximas primero
        }
    });

    return pendientes;
    }, [ausencias, filtroEmpleado, filtroTipo, filtroPuesto, ordenPor, datosUsuarios]);


  const handleAbrirDialogo = (ausencia, accion) => {
    setAusenciaSeleccionada(ausencia);
    setAccionSeleccionada(accion);
    setComentariosAdmin('');
    setDialogoAccion(true);
  };

  const handleConfirmarAccion = async () => {
    if (accionSeleccionada === 'rechazar' && comentariosAdmin.trim() === '') {
      showError('Debes escribir un motivo para rechazar la ausencia');
      return;
    }

    setProcesando(true);
    try {
      const nuevoEstado = accionSeleccionada === 'aprobar' ? 'aprobado' : 'rechazado';
      
      await cambiarEstadoAusencia(
        ausenciaSeleccionada.id,
        nuevoEstado,
        comentariosAdmin.trim(),
        ausenciaSeleccionada
      );

      setDialogoAccion(false);
      const tipoTexto = ausenciaSeleccionada.tipo === 'baja' ? 'Baja' : 'Permiso';
      const accionTexto = accionSeleccionada === 'aprobar' ? 'aprobado' : 'rechazado';
      
      showSuccess(`${tipoTexto} ${accionTexto} correctamente`);
      
      setAusenciaSeleccionada(null);
      setComentariosAdmin('');
    } catch (error) {
      showError('Error al procesar la ausencia: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const getColorTipo = (tipo) => {
    return tipo === 'baja' ? 'error' : 'purpura'; // rojo para baja, morado para permiso
  };

  const AusenciaCard = ({ ausencia }) => {
    const colorTipo = getColorTipo(ausencia.tipo);
    const userData = datosUsuarios[ausencia.solicitante] || {};
    const nombreFormateado = userData.nombre || formatearNombre(ausencia.solicitante);


    return (
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent sx={{p:2}}>
              <Box display="flex" justifyContent='space-between' alignItems="center" mb={1}>
                   <Chip
                        label={ausencia.tipo === 'baja' ? '🔴 BAJA' : '🟣 PERMISO'}
                        color={colorTipo}
                        variant="outlined"
                        size="small"      
                  />
                    <Typography variant="body1" fontWeight={600} color={colorTipo}>
                    {ausencia.motivo}
                    </Typography>
                  </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center',mt:2, mb: 1 }}>
                        <Typography variant="h6" fontWeight={600}>
                        {userData.nombre || ausencia.solicitante}
                        </Typography>
                        {userData.puesto && (
                        <Typography variant="subtitle1" color="">
                        {userData.puesto}
                        </Typography>
                        )}
                    </Box>
                        <Box sx={{ mb: 2, textAlign:"center" }}>
                          <Typography variant="body1"  gutterBottom>
                           Solicitado: {formatearFechaCorta(ausencia.fechaSolicitud)}
                          </Typography>
              <Typography variant="body1" fontWeight={600}>
                Días solicitados: {ausencia.fechas.length} día{ausencia.fechas.length !== 1 ? 's' : ''}
              </Typography>
  
              {ausencia.fechas.length === 1 ? (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: ausencia.tipo==="baja" ?'2px solid #d32f2f' :'4px solid #9C27B0',
                    bgcolor: '#fff',
                    textAlign: 'center',
                    mb:2
                  }}
                >
                  <Typography variant="body1" fontWeight={600} sx={{color:ausencia.tipo==="baja" ?'#d32f2f' :'#9C27B0'}}>
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
                      border: ausencia.tipo==="baja" ?'2px solid #d32f2f' :'2px solid #9C27B0',
                      bgcolor: '#fff',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      p: 1.5,
                      mb:2,
                      borderRadius: 2,
                      '&:hover': { bgcolor: 'azul.fondoFuerte' },
                    }}
                  >
                    <Typography variant="body1" fontWeight={600} sx={{color:ausencia.tipo==="baja" ?'#d32f2f' :'#9C27B0'}}>
                       Fechas de la ausencia
                    </Typography>
                    {ausenciaExpandida === ausencia.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                  <Collapse in={ausenciaExpandida === ausencia.id}>
                    <Grid container sx={{ mt: 1 }}>
                      {ordenarFechas(ausencia.fechas).map(fecha => (
                        <Grid size={{xs:6, md:4}}>
                        <Typography
                          key={fecha}
                          variant="body2"
                          color="text.primary"
                        >
                          • {formatearFechaCorta(fecha)}
                        </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Collapse>
                </>
              )}

            {/* Comentarios del solicitante */}
            {ausencia.comentariosSolicitante && (
                <Box sx={{ p: 1.5, bgcolor: '#f5f5f5', borderRadius: 2, borderLeft: `3px solid ${ausencia.tipo==="baja"?'red':'purple'}`}}>
                  <Typography variant="body1"  display="block" fontWeight={600}>
                    💬 Comentarios del solicitante:
                  </Typography>
                  <Typography variant="body1">
                    "{ausencia.comentariosSolicitante}"
                  </Typography>
                </Box>
            )}
            </Box>

            {/* Acciones */}

              <Box display="flex" gap={1} justifyContent="space-between" flexWrap="wrap">

                {/* Rechazar */}
                <Button
                  size="medium"
                  variant="contained"
                  startIcon={<RejectIcon />}
                  onClick={() => handleAbrirDialogo(ausencia, 'rechazar')}
                  sx={{
                      bgcolor: 'rojo.main',
                      color: 'white',
                      '&:hover': {
                          bgcolor: 'rojo.oscuro',
                          transform: 'scale(1.05)'
                    },
                    transition: 'all 0.2s ease',
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Rechazar
                </Button>
                {/* Aprobar */}
                <Button
                    size="medium"
                    variant="contained"
                    startIcon={<CheckIcon />}
                    onClick={() => handleAbrirDialogo(ausencia, 'aprobar')}
                    sx={{
                    bgcolor: 'verde.main',
                    color: 'white',
                    '&:hover': {
                        bgcolor: 'verde.oscuro',
                        transform: 'scale(1.05)'
                    },
                    transition: 'all 0.2s ease',
                    textTransform: 'none',
                    fontWeight: 600
                    }}
                >
                    Aprobar
                </Button>
              </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={60} sx={{ color: '#9C27B0' }} />
        <Typography variant="h6" ml={2}>
          Cargando ausencias...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {/* AppBar */}
      <AppBar 
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #7B1FA2 0%, #b02785ff 50%, #b02727ff 100%)',
          boxShadow: '0 2px 10px rgba(251, 140, 0, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/admin/ausencias')}
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
          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
              }}
            >
            Ausencias Pendientes
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              opacity: 0.9,
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            Aprueba/Deniega los Permisos y Bajas
          </Typography>
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          sx={{
            cursor: 'default'
          }}
        >
          <PendingActionsOutlinedIcon sx={{fontSize:'2rem'}}/>
        </IconButton>

      </Toolbar>
    </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Botón de filtros */}
        <Box display="flex" justifyContent="center" mb={2}>
        <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            endIcon={mostrarFiltros ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            sx={{
            borderColor: '#9C27B0',
            color: '#9C27B0',
            '&:hover': { bgcolor: '#f3e5f5', borderColor: '#7B1FA2' }
            }}
        >
            Filtros
        </Button>
        </Box>

        {/* Panel de filtros colapsable */}
        <Collapse in={mostrarFiltros}>
        <Card elevation={1} sx={{ mb: 3, bgcolor: '#f3e5f5' }}>
            <CardContent>
            <Grid container spacing={2}>
                {/* Filtro por empleado */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                    <InputLabel>Empleado</InputLabel>
                    <Select
                    value={filtroEmpleado}
                    onChange={(e) => setFiltroEmpleado(e.target.value)}
                    label="Empleado"
                    >
                    <MenuItem value="">Todos los empleados</MenuItem>
                    {empleadosDisponibles.map(empleado => (
                        <MenuItem key={empleado} value={empleado}>
                        {formatearNombre(empleado)}
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
                </Grid>

                {/* Filtro por tipo */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                    <InputLabel>Tipo</InputLabel>
                    <Select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    label="Tipo"
                    >
                    <MenuItem value="Todos">Todos</MenuItem>
                    <MenuItem value="Permiso">🟣 Permisos</MenuItem>
                    <MenuItem value="Baja">🔴 Bajas</MenuItem>
                    </Select>
                </FormControl>
                </Grid>

                {/* Filtro por puesto */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                    <InputLabel>Puesto</InputLabel>
                    <Select
                    value={filtroPuesto}
                    onChange={(e) => setFiltroPuesto(e.target.value)}
                    label="Puesto"
                    >
                    {puestosDisponibles.map(puesto => (
                        <MenuItem key={puesto} value={puesto}>
                        {puesto}
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
                </Grid>

                {/* Ordenar por */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                    <InputLabel>Ordenar por</InputLabel>
                    <Select
                    value={ordenPor}
                    onChange={(e) => setOrdenPor(e.target.value)}
                    label="Ordenar por"
                    >
                    <MenuItem value="fechaSolicitud">Fecha de solicitud</MenuItem>
                    <MenuItem value="fechaAusencia">Fecha de ausencia</MenuItem>
                    </Select>
                </FormControl>
                </Grid>
            </Grid>
            </CardContent>
        </Card>
        </Collapse>

        {/* Lista de ausencias pendientes */}
        {ausenciasPendientes.length === 0 ? (
          <Box textAlign="center" py={6}>
            <EventBusyOutlinedIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" mb={1}>
              No hay ausencias pendientes
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Todas las solicitudes han sido revisadas
            </Typography>
          </Box>
        ) : (
          ausenciasPendientes.map(ausencia => (
            <AusenciaCard key={ausencia.id} ausencia={ausencia} />
          ))
        )}
      </Container>

      {/* Diálogo de confirmación */}
      <Dialog
        open={dialogoAccion && ausenciaSeleccionada !== null}
        onClose={() => !procesando && setDialogoAccion(false)}
        maxWidth="sm"
        fullWidth
        >
        {ausenciaSeleccionada && (
            <>
        <DialogTitle sx={{bgcolor:accionSeleccionada==='aprobar'?'verde.main': 'rojo.main', color:'white', textAlign:'center',fontSize:'1.5rem'}}>
          {accionSeleccionada === 'aprobar' ? 'Aprobar ' : 'Rechazar '}{ausenciaSeleccionada.tipo==='baja'?'Baja':'Permiso'}
        </DialogTitle>
        <DialogContent>
          {ausenciaSeleccionada && (
            <>
              <Alert
                severity={accionSeleccionada === 'aprobar' ? 'success' : 'error'}
                sx={{ my: 2, textAlign:'center' }}
              >
                <Typography variant="body1" fontWeight={600}>
                  {datosUsuarios[ausenciaSeleccionada.solicitante].nombre}
                </Typography>
                <Typography variant="body2" display="block">
                  {ausenciaSeleccionada.tipo === 'baja' ? '🔴 Baja' : '🟣 Permiso'} • {ausenciaSeleccionada.motivo}
                </Typography>
                <Typography variant="body1" display="block">
                  {ausenciaSeleccionada.fechas.length} día{ausenciaSeleccionada.fechas.length !== 1 ? 's' : ''}
                </Typography>
              </Alert>

              <TextField
                fullWidth
                multiline
                rows={4}
                label={accionSeleccionada === 'aprobar' ? 'Comentarios (opcional)' : 'Motivo del rechazo (obligatorio)'}
                value={comentariosAdmin}
                onChange={(e) => setComentariosAdmin(e.target.value)}
                placeholder={
                  accionSeleccionada === 'aprobar'
                    ? 'Mensaje opcional para el empleado...'
                    : 'Explica por qué se rechaza esta ausencia...'
                }
                required={accionSeleccionada === 'rechazar'}
                disabled={procesando}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display:'flex', justifyContent:'space-between' }}>
          <Button
            onClick={() => setDialogoAccion(false)}
            disabled={procesando}
            variant="outlined"
            sx={{ fontSize:'1.2rem', textTransform: 'none', px: 2, py: 1 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarAccion}
            disabled={
              procesando ||
              (accionSeleccionada === 'rechazar' && comentariosAdmin.trim() === '')
            }
            variant="contained"
            color={accionSeleccionada === 'aprobar' ? 'success' : 'error'}
            sx={{ fontSize:'1.2rem', textTransform: 'none', px: 2, py: 1 }}
            startIcon={
              procesando ? (
                <CircularProgress size={20} color="inherit" />
              ) : accionSeleccionada === 'aprobar' ? (
                <CheckIcon />
              ) : (
                <RejectIcon />
              )
            }
          >
            {procesando
              ? 'Procesando...'
              : accionSeleccionada === 'aprobar'
              ? 'Aprobar'
              : 'Rechazar'}
          </Button>
        </DialogActions>
        </>
        )}
      </Dialog>
    </>
  );
};

export default AusenciasPendientes;
