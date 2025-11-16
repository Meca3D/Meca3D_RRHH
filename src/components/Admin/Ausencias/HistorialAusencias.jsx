// components/Admin/Ausencias/HistorialAusencias.jsx

import { useState, useEffect, useMemo,useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Chip, Alert, Grid, Collapse, Divider, Avatar, Paper,
  CircularProgress, Pagination, InputAdornment, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  History,
  Search,
  FilterList,
  GetApp,
  ExpandMore,
  ExpandLess,
  SelectAll as SelectAllIcon,
  CancelOutlined,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Cancel as CancelIcon,
  Clear,
  DynamicFeedOutlined as DynamicFeedOutlinedIcon,
  AddCircleOutline as AddIcon,
  Rule as RuleIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useAusenciasStore } from '../../../stores/ausenciasStore';
import { useAuthStore } from '../../../stores/authStore';
import { useUIStore } from '../../../stores/uiStore';
import { formatearFechaCorta, formatearFechaLarga, ordenarFechas, esFechaPasadaOHoy } from '../../../utils/dateUtils';
import { formatearNombre, capitalizeFirstLetter } from '../../Helpers';
import CalendarioAusencias from '../../Ausencias/CalendarioAusencias';

const HistorialAusencias = () => {
  const navigate = useNavigate();
  const {
    ausencias,
    loadAusencias,
    obtenerDiasCancelados,
    obtenerDiasAgregados,
    calcularEstadoRealFechas,
    añadirDiasAusencia,
    cancelarDiasAusencia
  } = useAusenciasStore();
  const { obtenerDatosUsuarios: obtenerDatosAuth } = useAuthStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [ausenciasFiltradas, setAusenciasFiltradas] = useState([]);
  const [datosUsuarios, setDatosUsuarios] = useState({});
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Estados de diálogos
  const [dialogAñadirDias, setDialogAñadirDias] = useState(false);
  const [dialogCancelarDias, setDialogCancelarDias] = useState(false);
  const [ausenciaSeleccionada, setAusenciaSeleccionada] = useState(null);
  const [nuevasFechas, setNuevasFechas] = useState([]);
  const [diasACancelar, setDiasACancelar] = useState([]);
  const [motivoEdicion, setMotivoEdicion] = useState('');
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Estados de expansión
  const [cancelacionesExpanded, setCancelacionesExpanded] = useState({});
  const [cardExpanded, setCardExpanded] = useState({});

  // Estados de filtros
  const [filtros, setFiltros] = useState({
    estado: 'todos',
    empleado: '',
    tipo: 'todos', // todos, permiso, baja
    año: new Date().getFullYear(),
    busqueda: ''
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estados de paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const ausenciasPorPagina = 10;

  // Menu de acciones
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [ausenciaMenu, setAusenciaMenu] = useState(null);

  // Cargar ausencias y datos de usuarios
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const unsub = loadAusencias();
        
        return () => {
          if (typeof unsub === 'function') unsub();
        };
      } catch (error) {
        showError('Error cargando ausencias: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Cargar datos de usuarios cuando cambien las ausencias
  useEffect(() => {
    const cargarUsuarios = async () => {
      if (ausencias.length > 0) {
        const emails = [...new Set(ausencias.map(a => a.solicitante))];
        const usuarios = await obtenerDatosAuth(emails);
        setDatosUsuarios(usuarios);
      }
    };

    cargarUsuarios();
  }, [ausencias, obtenerDatosAuth]);

  // Aplicar filtros
  useEffect(() => {
    let filtradas = [...ausencias];

    // Filtro por estado
    if (filtros.estado !== 'todos') {
      filtradas = filtradas.filter(a => a.estado === filtros.estado);
    }

    // Filtro por empleado
    if (filtros.empleado) {
      filtradas = filtradas.filter(a => a.solicitante === filtros.empleado);
    }

    // Filtro por tipo
    if (filtros.tipo !== 'todos') {
      filtradas = filtradas.filter(a => a.tipo === filtros.tipo);
    }

    // Filtro por año
    if (filtros.año) {
      filtradas = filtradas.filter(a => {
        const añoSolicitud = new Date(a.fechaSolicitud).getFullYear();
        return añoSolicitud === parseInt(filtros.año);
      });
    }

    // Filtro por búsqueda
    if (filtros.busqueda) {
      const termino = filtros.busqueda.toLowerCase();
      filtradas = filtradas.filter(a => {
        const userData = datosUsuarios[a.solicitante] || {};
        const nombre = (userData.nombre || a.solicitante).toLowerCase();
        const comentarios = (a.comentariosSolicitante || '').toLowerCase();
        const comentariosAdmin = (a.comentariosAdmin || '').toLowerCase();
        
        return nombre.includes(termino) ||
               a.solicitante.toLowerCase().includes(termino) ||
               a.motivo.toLowerCase().includes(termino) ||
               comentarios.includes(termino) ||
               comentariosAdmin.includes(termino);
      });
    }

    // Ordenar por fecha de solicitud (más recientes primero)
    filtradas.sort((a, b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud));

    setAusenciasFiltradas(filtradas);
    setPaginaActual(1);
  }, [ausencias, filtros, datosUsuarios]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    return {
      total: ausencias.length,
      pendientes: ausencias.filter(a => a.estado === 'pendiente').length,
      aprobadas: ausencias.filter(a => a.estado === 'aprobado').length,
      rechazadas: ausencias.filter(a => a.estado === 'rechazado').length,
      canceladas: ausencias.filter(a => a.estado === 'cancelado').length,
      permisos: ausencias.filter(a => a.tipo === 'permiso').length,
      bajas: ausencias.filter(a => a.tipo === 'baja').length
    };
  }, [ausencias]);

  // Empleados y años disponibles
  const empleadosDisponibles = useMemo(() => {
    return [...new Set(ausencias.map(a => a.solicitante))].sort();
  }, [ausencias]);

  const añosDisponibles = useMemo(() => {
    const años = new Set();
    const añoActual = new Date().getFullYear();
    
    for (let i = añoActual; i >= añoActual - 5; i--) {
      años.add(i);
    }
    
    ausencias.forEach(a => {
      const año = new Date(a.fechaSolicitud).getFullYear();
      años.add(año);
    });
    
    return [...años].sort((a, b) => b - a);
  }, [ausencias]);

  // Paginación
  const ausenciasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * ausenciasPorPagina;
    const fin = inicio + ausenciasPorPagina;
    return ausenciasFiltradas.slice(inicio, fin);
  }, [ausenciasFiltradas, paginaActual]);

  const totalPaginas = Math.ceil(ausenciasFiltradas.length / ausenciasPorPagina);

  // Handlers de menú
  const handleAbrirMenu = (event, ausencia) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setAusenciaMenu(ausencia);
  };

  const handleCerrarMenu = () => {
    setMenuAnchor(null);
    setAusenciaMenu(null);
  };

  // Abrir dialog añadir días
  const handleAbrirAñadirDias = (ausencia) => {
    handleCerrarMenu();
    setAusenciaSeleccionada(ausencia);
    setNuevasFechas([]);
    setMotivoEdicion('');
    setDialogAñadirDias(true);
  };

  // Confirmar añadir días
  const handleConfirmarAñadirDias = async () => {
    if (nuevasFechas.length === 0) {
      showError('Debes seleccionar al menos una fecha');
      return;
    }

    if (motivoEdicion.trim()=== "") {
      showError('Debes escribir un motivo');
      return;
    }

    setProcesando(true);
    try {
      await añadirDiasAusencia(
        ausenciaSeleccionada.id,
        nuevasFechas,
        motivoEdicion.trim(),
        ausenciaSeleccionada,
        true // esAdmin
      );

      showSuccess(`${nuevasFechas.length} día(s) añadido(s) correctamente`);
      setDialogAñadirDias(false);
      setAusenciaSeleccionada(null);
      setNuevasFechas([]);
      setMotivoEdicion('');
    } catch (error) {
      showError('Error al añadir días: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  // Abrir dialog cancelar días
  const handleAbrirCancelarDias = (ausencia) => {
    handleCerrarMenu();
    setAusenciaSeleccionada(ausencia);
    setDiasACancelar([]);
    setMotivoCancelacion('');
    setDialogCancelarDias(true);
  };

  // Confirmar cancelar días
  const handleConfirmarCancelarDias = async () => {
    if (diasACancelar.length === 0) {
      showError('Debes seleccionar al menos un día');
      return;
    }

    if (!motivoCancelacion.trim()) {
      showError('Debes especificar un motivo');
      return;
    }

    setProcesando(true);
    try {
      await cancelarDiasAusencia(
        ausenciaSeleccionada.id,
        diasACancelar,
        motivoCancelacion.trim(),
        ausenciaSeleccionada
      );

      const esCancelacionTotal = diasACancelar.length === ausenciaSeleccionada.fechasActuales.length;
      showSuccess(
        esCancelacionTotal
          ? 'Ausencia cancelada completamente'
          : `${diasACancelar.length} día(s) cancelado(s) correctamente`
      );

      setDialogCancelarDias(false);
      setAusenciaSeleccionada(null);
      setDiasACancelar([]);
      setMotivoCancelacion('');
    } catch (error) {
      showError('Error al cancelar días: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  // Exportar a CSV
  const handleExportarCSV = async () => {
    setExportando(true);
    try {
      const csv = [];
      const headers = [
        'Empleado',
        'Tipo',
        'Motivo',
        'Estado',
        'Fecha Solicitud',
        'Días Originales',
        'Días Actuales',
        'Comentarios Solicitante',
        'Comentarios Admin'
      ];
      csv.push(headers.join(','));

      ausenciasFiltradas.forEach(a => {
        const userData = datosUsuarios[a.solicitante] || {};
        const row = [
          `"${userData.nombre || a.solicitante}"`,
          capitalizeFirstLetter(a.tipo),
          `"${a.motivo}"`,
          capitalizeFirstLetter(a.estado),
          formatearFechaCorta(a.fechaSolicitud),
          a.fechas.length,
          a.fechasActuales.length,
          `"${(a.comentariosSolicitante || '').replace(/"/g, '""')}"`,
          `"${(a.comentariosAdmin || '').replace(/"/g, '""')}"`
        ];
        csv.push(row.join(','));
      });

      const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `historial_ausencias_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      showSuccess('Historial exportado correctamente');
    } catch (error) {
      showError('Error al exportar: ' + error.message);
    } finally {
      setExportando(false);
    }
  };

    // Toggle para acordeón de cancelaciones parciales
  const toggleCancelacionesExpanded = (ausenciaId) => {
    setCancelacionesExpanded(prev => ({
      ...prev,
      [ausenciaId]: !prev[ausenciaId]
    }));
  };

  const toggleCardExpanded = (ausenciaId) => {
    setCardExpanded(prev => ({
        ...prev,
        [ausenciaId]: !prev[ausenciaId]
    }));
};

  // Componente Card de Ausencia
  const AusenciaCard = ({ ausencia, isExpanded, onToggleExpand }) => {
  const { activas, canceladas, agregadas } = calcularEstadoRealFechas(ausencia);
  const todasLasFechasAgregadas = obtenerDiasAgregados(ausencia.ediciones || []);
  const todasLasFechas = [...new Set([...ausencia.fechas, ...todasLasFechasAgregadas])];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  // Determinar qué acciones puede hacer el admin
  const puedeAñadirDias = ausencia.estado === 'cancelado' || ausencia.estado === 'aprobado';
  const puedeCancelarDias = (ausencia.estado === 'cancelado' || ausencia.estado === 'aprobado') 
                             && ausencia.fechasActuales.length > 0;
    const handleAbrirMenu = (event) => {
        event.stopPropagation();
        setMenuOpen(true);
    };

    const handleCerrarMenu = () => {
        setMenuOpen(false);
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
    return tipo === 'baja' ? 'error' : 'purpura';
  };

  const colorEstado = getColorEstado(ausencia.estado);
  const colorTipo = getColorTipo(ausencia.tipo);

  return (
    <Card
      elevation={2}
      sx={{
        mb: 2,
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        '&:hover': { boxShadow: 4 }
      }}
    >
      <CardContent>
        <Grid container spacing={2}>
          {/* Cabecera con estado, tipo y menú */}
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
                {(puedeAñadirDias || puedeCancelarDias) && (
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
                    {puedeAñadirDias && (
                    <MenuItem onClick={() => handleAbrirAñadirDias(ausencia)}>
                        <ListItemIcon>
                        <AddIcon fontSize="small" sx={{ color: 'success.main' }} />
                        </ListItemIcon>
                        <ListItemText primary="Añadir días" />
                    </MenuItem>
                    )}
                    {puedeCancelarDias && (
                    <MenuItem onClick={() => handleAbrirCancelarDias(ausencia)}>
                        <ListItemIcon>
                        <CancelIcon fontSize="small" sx={{ color: 'warning.main' }} />
                        </ListItemIcon>
                        <ListItemText primary="Cancelar días" />
                    </MenuItem>
                    )}
                </Menu>
                    </>
                    )}
                </Box>
                </Grid>
            {/* Información principal */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h5"  display="block">
                {datosUsuarios[ausencia.solicitante]?.nombre}
              </Typography>
            </Grid>

            {/* Fechas importantes */}
            <Grid size={{ xs: 12 }}>
             <Typography variant="h6" fontWeight={600} color={colorTipo}>
                {ausencia.motivo}
              </Typography>
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

              {ausencia.estado==='cancelado' && (
                <Typography variant="body1" color="warning.main" display="block">
                  ⚠️ Cancelada: {formatearFechaCorta(ausencia.cancelaciones[ausencia.cancelaciones.length-1].fechaCancelacion)}
                </Typography>
              )}
            </Grid>
            
            {/* Duración */}
            <Grid size={{ xs: 12 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" width={'100%'} sx={{mb:-2}}>
              <Typography variant="body1" fontWeight={600}>
                {capitalizeFirstLetter(ausencia.tipo)} Original: {ausencia.fechas.length} día{ausencia.fechas.length !== 1 ? 's' : ''}
              </Typography>
            <IconButton onClick={() => onToggleExpand(ausencia.id)}
                >
            {isExpanded ? <ExpandLessIcon sx={{fontSize:'2rem'}}/> : <ExpandMoreIcon sx={{fontSize:'2rem'}}/>}

             </IconButton>
             </Box>
             </Grid>
            <Grid size={{ xs: 12 }}>
            <Collapse in={isExpanded} >
            {/* Lista de fechas */}
              {ausencia.fechas.length === 1 ? (
                <>
                <Box
                  sx={{
                    display: 'block',
                    width: '100%',
                    cursor: 'pointer',
                    p: 1.5,
                    mb:1,
                    bgcolor: `${colorEstado.fondo}.fondo`,
                    borderRadius: 2,
                    
                  }}
                > <Typography variant="body1" textAlign= 'center' fontWeight={600}>
                      Fecha de la ausencia
                  </Typography>
                </Box>
                  <Typography variant="body1" textAlign='center' sx={{mb:1}}>
                    • {formatearFechaLarga(ausencia.fechas[0])}
                  </Typography>
                  </>
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      p: 1.5,
                      mb:1,
                      bgcolor: `${colorEstado.fondo}.fondo`,
                      borderRadius: 2,
                      '&:hover': { bgcolor: `${colorEstado.fondo}.fondoFuerte` },
                    }}
                  >
                    <Typography variant="body1" fontWeight={600}>
                      Fechas de la ausencia
                    </Typography>
                  </Box>
                    <Grid container sx={{ mb: 1 }}>
                      {/* Obtener listas para clasificar */}
                      {(() => {
                        
                      return ordenarFechas(todasLasFechas).map(fecha => {
                        const esPasada = esFechaPasadaOHoy(fecha);
                        const esAgregada = agregadas.includes(fecha);
                        const estaCancelada = canceladas.includes(fecha);
                        const estaActiva = ausencia.fechasActuales.includes(fecha);
                        
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
                          icono = '❌';
                        } else if (esAgregada) {
                          // Fecha añadida (puede ser nueva o reactivada)
                          colorTexto = 'success.main';
                          etiqueta = '(Añadido)';
                          icono = '➕';
                        }   
                          return (
                            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={fecha}>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Typography
                                  variant="body1"
                                  color={colorTexto}
                                  sx={{ 
                                    textDecoration: decoracion,
                                    opacity: esPasada ? 0.8 : 1,
                                    fontStyle: esPasada? 'italic': 'normal',
                                    fontWeight: 500
                                  }}
                                >
                                  {icono} {formatearFechaCorta(fecha)}
                                </Typography>
                                {etiqueta && (
                                  <Typography 
                                    variant="body1" 
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
                    {ausencia.fechas !== ausencia.fechasActuales && (
                      <>
                      <Divider sx={{bgcolor:'black', mt:1}} />
                      <Grid container sx={{ my: 1, pl: 2 }}>
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

            {/* Comentarios del solicitante */}
            {ausencia.comentariosSolicitante && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ p: 1.5, mb:1, bgcolor: '#f5f5f5', borderRadius: 2, borderLeft: `3px solid ${ausencia.tipo==="baja"?'red':'purple'}` }}>
                  <Typography variant="body1" display="block" fontWeight={600}>
                    💬 Comentarios Solicitante:
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
                <Divider sx={{my:2, bgcolor: 'black' }} />
                
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
                          <Typography variant="body2" color="" display="block" mb={1}>
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
                                  mb:0.5,
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
                            {edicion.fechasAgregadas.length===1?'Día añadido':'Días añadidos'} por: <strong>{edicion.editadoPor}</strong>
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
                          <Typography variant="body2" color="" display="block" mb={1}>
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
                            {cancelacion.diasCancelados.length===1 ? 'Día cancelado' : 'Días cancelados'} por: <strong>{cancelacion.canceladoPor}</strong>
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
                 onClick={() => navigate('/admin/ausencias')}
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
                 >Historial de Ausencias
                </Typography>
                      <Typography 
                          variant="caption" 
                          sx={{ 
                          opacity: 0.9,
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                          }}
                      >
                        Gestiona los Permisos y Bajas
                      </Typography>
                    </Box>
                    <DynamicFeedOutlinedIcon sx={{ fontSize: '2rem' }} />
                  </Toolbar>
                </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Estadísticas */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {estadisticas.aprobadas}
              </Typography>
              <Typography variant="body2" color="text.secondary">Aprobadas</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} color="info.main">
                {estadisticas.pendientes}
              </Typography>
              <Typography variant="body2" color="text.secondary">Pendientes</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} color="error.main">
                {estadisticas.rechazadas}
              </Typography>
              <Typography variant="body2" color="text.secondary">Rechazadas</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {estadisticas.canceladas}
              </Typography>
              <Typography variant="body2" color="text.secondary">Canceladas</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Barra de controles */}
        <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Buscar por nombre, motivo, comentarios..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: filtros.busqueda && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setFiltros({ ...filtros, busqueda: '' })}
                      >
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              endIcon={mostrarFiltros ? <ExpandLess /> : <ExpandMore />}
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              sx={{
                borderColor: '#9C27B0',
                color: '#9C27B0',
                '&:hover': { bgcolor: '#f3e5f5' }
              }}
            >
              Filtros
            </Button>
          </Grid>
{/*           <Grid size={{ xs: 6, md: 3 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={exportando ? <CircularProgress size={20} color="inherit" /> : <GetApp />}
              onClick={handleExportarCSV}
              disabled={exportando || ausenciasFiltradas.length === 0}
              sx={{
                bgcolor: '#9C27B0',
                '&:hover': { bgcolor: '#7B1FA2' }
              }}
            >
              {exportando ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </Grid> */}
        </Grid>

        {/* Panel de filtros */}
        <Collapse in={mostrarFiltros}>
          <Card elevation={1} sx={{ mb: 3, bgcolor: '#f3e5f5' }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Estado</InputLabel>
                    <Select
                      value={filtros.estado}
                      onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                      label="Estado"
                    >
                      <MenuItem value="todos">Todos</MenuItem>
                      <MenuItem value="pendiente">Pendientes</MenuItem>
                      <MenuItem value="aprobado">Aprobadas</MenuItem>
                      <MenuItem value="rechazado">Rechazadas</MenuItem>
                      <MenuItem value="cancelado">Canceladas</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={filtros.tipo}
                      onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                      label="Tipo"
                    >
                      <MenuItem value="todos">Todos</MenuItem>
                      <MenuItem value="permiso">🟣 Permisos</MenuItem>
                      <MenuItem value="baja">🔴 Bajas</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Empleado</InputLabel>
                    <Select
                      value={filtros.empleado}
                      onChange={(e) => setFiltros({ ...filtros, empleado: e.target.value })}
                      label="Empleado"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {empleadosDisponibles.map(email => (
                        <MenuItem key={email} value={email}>
                          {(datosUsuarios[email]?.nombre || email)}
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
                      onChange={(e) => setFiltros({ ...filtros, año: e.target.value })}
                      label="Año"
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
            </CardContent>
          </Card>
        </Collapse>

        {/* Lista de ausencias */}
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={8}>
            <CircularProgress size={60} sx={{ color: '#9C27B0' }} />
            <Typography variant="h6" ml={2}>Cargando ausencias...</Typography>
          </Box>
        ) : ausenciasPaginadas.length === 0 ? (
          <Alert severity="info">
            No hay ausencias que coincidan con los filtros aplicados
          </Alert>
        ) : (
          ausenciasPaginadas.map(ausencia => (
            <AusenciaCard 
                key={ausencia.id} 
                ausencia={ausencia} 
                isExpanded={cardExpanded[ausencia.id] || false} 
                onToggleExpand={toggleCardExpanded} 
                />
            
          ))
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination
              count={totalPaginas}
              page={paginaActual}
              onChange={(e, page) => setPaginaActual(page)}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Container>

      {/* Menú de acciones */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCerrarMenu}
      >
        <MenuItem onClick={() => handleAbrirAñadirDias(ausenciaMenu)}>
          <ListItemIcon>
            <AddIcon fontSize="small" sx={{ color: 'success.main' }} />
          </ListItemIcon>
          <ListItemText>Añadir días</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAbrirCancelarDias(ausenciaMenu)}>
          <ListItemIcon>
            <CancelOutlined fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Cancelar días</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialog Añadir Días */}
      <Dialog
        open={dialogAñadirDias && ausenciaSeleccionada !== null}
        onClose={() => !procesando && setDialogAñadirDias(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle bgcolor='verde.main' color='white' textAlign='center'>Añadir días</DialogTitle>
        <DialogContent sx={{p:2}}>
          {ausenciaSeleccionada && (
            <>
             <Box bgcolor="azul.fondo" sx={{ my: 2,p:2, borderRadius:2 }}>
                <Typography variant="body1" textAlign='center' mb={1}>
                  <strong>{formatearNombre(datosUsuarios[ausenciaSeleccionada.solicitante]?.nombre || ausenciaSeleccionada.solicitante)}</strong>
                </Typography>
                <Box sx={{display:'flex', justifyContent:'space-between'}}>
                <Typography variant="body1" display="block">
                  {capitalizeFirstLetter(ausenciaSeleccionada.tipo)}:
                </Typography>
                <Typography variant="body1" display="block">
                  {ausenciaSeleccionada.motivo}
                </Typography>
                </Box>
                 <Box sx={{display:'flex', justifyContent:'space-between'}}>
                <Typography variant="body1">
                  Días disponibles:
                </Typography>
                <Typography variant="body1">
                  {ausenciaSeleccionada.fechasActuales.length}
                </Typography>
              </Box>
                </Box>

              <Typography fontSize='1.1rem' textAlign="center"mb={1}>
                Selecciona las fechas a añadir
              </Typography>

              
                <CalendarioAusencias
                  fechasSeleccionadas={nuevasFechas}
                  onFechasChange={setNuevasFechas}
                  esAdmin={true} // Sin restricciones
                  fechasOriginales={ausenciaSeleccionada.fechasActuales}
                />
             

              <TextField
                sx={{mt:2}}
                fullWidth
                multiline
                rows={2}
                label="Motivo"
                value={motivoEdicion}
                required
                onChange={(e) => setMotivoEdicion(e.target.value)}
                placeholder="Ej: Extensión solicitada por el empleado"
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            sx={{
                py:1,
                fontSize: '1rem',
                textTransform: 'none'
            }}
            onClick={() => setDialogAñadirDias(false)}
            disabled={procesando}
            variant="outlined"
          >
            Volver
          </Button>
          <Button
            sx={{
                py:1,
                fontSize: '1rem',
                textTransform: 'none'
            }}
            onClick={handleConfirmarAñadirDias}
            disabled={procesando || nuevasFechas.length === 0 || !motivoEdicion.trim()}
            variant="contained"
            color="success"
            startIcon={procesando ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          >
            {procesando ? 'Añadiendo...' : `Añadir ${nuevasFechas.length} ${nuevasFechas.length===1 ? 'día': 'días'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Cancelar Días */}
      <Dialog
        open={dialogCancelarDias && ausenciaSeleccionada !== null}
        onClose={() => !procesando && setDialogCancelarDias(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle textAlign='center' color='white'bgcolor='naranja.main'>Cancelar días</DialogTitle>
        <DialogContent sx={{p:2, my:2}}>
          {ausenciaSeleccionada && (
            <>
              <Box bgcolor="naranja.fondo" sx={{ mb: 2,p:2 }}>
                <Typography variant="body1" textAlign='center' mb={1}>
                  <strong>{formatearNombre(datosUsuarios[ausenciaSeleccionada.solicitante]?.nombre || ausenciaSeleccionada.solicitante)}</strong>
                </Typography>
                <Box sx={{display:'flex', justifyContent:'space-between'}}>
                <Typography variant="body1" display="block">
                  {capitalizeFirstLetter(ausenciaSeleccionada.tipo)}:
                </Typography>
                <Typography variant="body1" display="block">
                  {ausenciaSeleccionada.motivo}
                </Typography>
                </Box>
                 <Box sx={{display:'flex', justifyContent:'space-between'}}>
                <Typography variant="body1">
                  Días disponibles:
                </Typography>
                <Typography variant="body1">
                  {ausenciaSeleccionada.fechasActuales.length}
                </Typography>
              </Box>
                </Box>

              <Typography fontSize='1.1rem' textAlign='center' mb={1}>
                Selecciona los días a cancelar
              </Typography>

              <Grid container sx={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: 2, 
                p: 1.5,
                mb: 2 
              }}>
                {ausenciaSeleccionada.fechasActuales.map(fecha => (
                  <Grid size={{xs:6, md:4}}
                    key={fecha}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      p: 0.5,
                      '&:hover': { bgcolor: '#f5f5f5' }
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

              <Button
                size="small"
                variant="outlined"
                fullWidth
                onClick={() => {
                  const todosDias = ausenciaSeleccionada.fechasActuales;
                  setDiasACancelar(
                    diasACancelar.length === todosDias.length ? [] : todosDias
                  );
                }}
                sx={{ mb: 2, p:1, fontSize: '1rem' }}
              > <SelectAllIcon sx={{mr:1.5, fontSize:'1.65rem'}}/>
                {diasACancelar.length === ausenciaSeleccionada.fechasActuales.length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </Button>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Motivo (obligatorio)"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Ej: Reincorporación anticipada por mejoría"
                required
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            sx={{
                py:1,
                fontSize: '1rem',
                textTransform: 'none'
            }}
            onClick={() => setDialogCancelarDias(false)}
            disabled={procesando}
            variant="outlined"
          >
            Volver
          </Button>
          <Button
            sx={{
                py:1,
                fontSize: '1rem',
                textTransform: 'none'
            }}
            onClick={handleConfirmarCancelarDias}
            disabled={procesando || diasACancelar.length === 0 || !motivoCancelacion.trim()}
            variant="contained"
            color={diasACancelar.length === ausenciaSeleccionada?.fechasActuales?.length ? 'error' : 'warning'}
            startIcon={procesando ? <CircularProgress size={20} color="inherit" /> : <CancelOutlined />}
          >
            {procesando ? 'Cancelando...' : 'Cancelar'} {diasACancelar.length} {diasACancelar.length===1 ? 'día': 'días'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HistorialAusencias;
