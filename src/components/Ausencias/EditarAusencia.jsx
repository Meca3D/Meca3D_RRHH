// components/Ausencias/EditarAusencia.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, Alert, CircularProgress,
  Collapse, MenuItem, Select, InputLabel, FormControl, Grid,
  Divider
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  EditCalendarOutlined as EditCalendarOutlinedIcon,
  Save as SaveIcon,
  CardMembershipRounded
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useAusenciasStore } from '../../stores/ausenciasStore';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import { useUIStore } from '../../stores/uiStore';
import { ordenarFechas, esFechaPasadaOHoy, formatearFechaCorta, formatearFechaLarga } from '../../utils/dateUtils';
import CalendarioAusencias from './CalendarioAusencias';

const EditarAusencia = () => {
  const navigate = useNavigate();
  const { ausenciaId } = useParams();
  const { user } = useAuthStore();
  const {
    actualizarAusencia,
    obtenerAusenciaCompleta,
    motivosPermisos,
    motivosBajas,
    loadConfigAusencias
  } = useAusenciasStore();
  const { loadFestivos } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [ausenciaOriginal, setAusenciaOriginal] = useState(null);
  const [tipo, setTipo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);
  const [comentariosSolicitante, setComentariosSolicitante] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mostrarListaFechas, setMostrarListaFechas] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Cargar festivos y config
        const unsubFestivos = loadFestivos();
        const unsubConfig = loadConfigAusencias();

        // Cargar ausencia
        const ausencia = await obtenerAusenciaCompleta(ausenciaId);

        // Verificar permisos
        if (ausencia.solicitante !== user?.email) {
          showError('No tienes permisos para editar esta ausencia');
          navigate('/ausencias/MisAusencias');
          return;
        }

        // Verificar que sea editable (solo pendientes)
        if (ausencia.estado !== 'pendiente') {
          showError('Solo se pueden editar ausencias pendientes');
          navigate('/ausencias/MisAusencias');
          return;
        }

        // Verificar que tenga fechas futuras
        const primeraFecha = ausencia.fechas[0];
        if (esFechaPasadaOHoy(primeraFecha)) {
          showError('No se pueden editar ausencias con fechas pasadas');
          navigate('/ausencias/MisAusencias');
          return;
        }

        // Establecer datos iniciales
        setAusenciaOriginal(ausencia);
        setTipo(ausencia.tipo);
        setMotivo(ausencia.motivo);
        setFechasSeleccionadas([...ausencia.fechas]);
        setComentariosSolicitante(ausencia.comentariosSolicitante || '');

        return () => {
          if (typeof unsubFestivos === 'function') unsubFestivos();
          if (typeof unsubConfig === 'function') unsubConfig();
        };
      } catch (error) {
        showError('Error al cargar la ausencia: ' + error.message);
        navigate('/ausencias/solicitudes');
      } finally {
        setLoading(false);
      }
    };

    if (ausenciaId && user?.email) {
      cargarDatos();
    }
  }, [ausenciaId, user?.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!ausenciaOriginal) return;

    // Validaciones
    if (!tipo) {
      showError('Debes seleccionar un tipo de ausencia');
      return;
    }

    if (!motivo) {
      showError('Debes seleccionar un motivo');
      return;
    }

    if (fechasSeleccionadas.length === 0) {
      showError('Debes seleccionar al menos una fecha');
      return;
    }

    if (motivo === 'Otros' && comentariosSolicitante.trim() === '') {
      showError('Debes especificar el motivo en los comentarios cuando seleccionas "Otros"');
      return;
    }

    setSaving(true);
    try {
      const datosActualizados = {
        tipo,
        motivo,
        fechas: ordenarFechas(fechasSeleccionadas),
        comentariosSolicitante: comentariosSolicitante.trim()
      };

      await actualizarAusencia(ausenciaId, datosActualizados, ausenciaOriginal);

      showSuccess('Ausencia actualizada correctamente');
      navigate('/ausencias/MisAusencias');
    } catch (err) {
      showError(`Error al actualizar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const motivosDisponibles = tipo === 'permiso' ? motivosPermisos : tipo === 'baja' ? motivosBajas : [];

  const getColorTipo = (tipo) => {
    return tipo === 'baja' ? 'error' : 'secondary'; // rojo para baja, morado para permiso
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={60} sx={{ color: '#9C27B0' }} />
        <Typography variant="h6" ml={2}>
          Cargando ausencia...
        </Typography>
      </Box>
    );
  }

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
            onClick={() => navigate('/ausencias/solicitudes')}
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
            >
            Editar Ausencia
            </Typography>
            <Typography 
                variant="caption" 
                sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
                }}
            >
                Modifica tus Permisos y Bajas
            </Typography>
            </Box>
            <EditCalendarOutlinedIcon sx={{ fontSize: '2rem' }} />
        </Toolbar>
        </AppBar>

      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {/* Información original */}
          {ausenciaOriginal && (
            <Card sx={{ mb: 3, p:3 }}>
              <Typography fontSize='1.5rem' textAlign='center' fontWeight={600} mb={0.5}>
                Solicitud original
              </Typography>
              <Divider sx={{bgcolor:'black'}}/>
              <Box sx={{display:'flex', justifyContent:'space-between', mt:2}}>
              <Typography fontSize='1.25rem'>
                • Tipo: 
              </Typography>
              <Typography fontSize='1.25rem'>
                {ausenciaOriginal.tipo === 'baja' ? '🔴 Baja' : '🟣 Permiso'}
              </Typography>
              </Box>
              <Box sx={{display:'flex', justifyContent:'space-between'}}>
              <Typography fontSize='1.25rem'>
                • Motivo: 
              </Typography>
              <Typography fontSize='1.25rem'>
                {ausenciaOriginal.motivo}
              </Typography>
              </Box>
               <Box sx={{display:'flex', justifyContent:'space-between'}}>
              <Typography fontSize='1.25rem'>
                • Días: 
              </Typography>
              <Typography fontSize='1.25rem'>
                {ausenciaOriginal.fechas.length}
              </Typography>
              </Box>
            </Card>
          )}

          {/* Card principal */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              {/* Tipo de ausencia */}
              <Typography variant="body1" textAlign='center' fontWeight={600} mb={2}>
                Tipo de ausencia
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="tipo-label">Tipo</InputLabel>
                <Select
                  labelId="tipo-label"
                  value={tipo}
                  onChange={(e) => {
                    setTipo(e.target.value);
                    setMotivo(''); // Reset motivo al cambiar tipo
                  }}
                  label="Tipo"
                  required
                >
                  <MenuItem value="permiso">🟣 Permiso</MenuItem>
                  <MenuItem value="baja">🔴 Baja</MenuItem>
                </Select>
              </FormControl>

              {/* Motivo */}
              {tipo && (
                <Collapse in={!!tipo}>
                  <Typography variant="body1" textAlign='center' fontWeight={600} mb={2}>
                    Motivo
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel id="motivo-label">Selecciona un motivo</InputLabel>
                    <Select
                      labelId="motivo-label"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      label="Selecciona un motivo"
                      required
                    >
                      {motivosDisponibles.map(m => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Collapse>
              )}

              {/* Fechas */}
              {tipo && motivo && (
                <Collapse in={!!tipo && !!motivo}>
                  <Typography variant="body1" textAlign='center' fontWeight={600} mb={1}>
                    Selecciona las fechas
                  </Typography>
                  <Box
                    sx={{
                      border: '2px solid #e0e0e0',
                      borderRadius: 2,
                      p: 2,
                      bgcolor: '#fafafa',
                      mb: 3
                    }}
                  >
                    <CalendarioAusencias
                      fechasSeleccionadas={fechasSeleccionadas}
                      onFechasChange={setFechasSeleccionadas}
                    />
                  </Box>
                </Collapse>
              )}

              {/* Comentarios */}
              {fechasSeleccionadas.length > 0 && (
                <Collapse in={fechasSeleccionadas.length > 0}>
                  <Typography variant="body1" textAlign='center' fontWeight={600} mb={1}>
                    Comentarios 
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={comentariosSolicitante}
                    onChange={(e) => setComentariosSolicitante(e.target.value)}
                    required={true}
                    sx={{ mb: 1 }}
                  />
                </Collapse>
              )}
            </CardContent>
          </Card>

          {/* Resumen de cambios */}
          {fechasSeleccionadas.length > 0 && (
            <Card elevation={3} sx={{ mb: 3, borderLeft: tipo==="baja" ? '5px solid #d32f2f' :'5px solid #9C27B0' }}>
              <CardContent>
                <Typography variant="h6" textAlign='center' fontWeight={700} mb={2} sx={{color:tipo==="baja" ?'#d32f2f' :'#9C27B0'}}>
                  Resumen de cambios
                </Typography>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1">Tipo:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {tipo === 'permiso' ? '🟣 Permiso' : '🔴 Baja'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1">Motivo:</Typography>
                  <Typography variant="body1" fontWeight={600}>{motivo}</Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body1">Total días:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {fechasSeleccionadas.length} día{fechasSeleccionadas.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>

                {/* Lista de fechas */}
                {fechasSeleccionadas.length === 1 ? (
                  <Box textAlign="center" py={1}>
                    <Typography variant="body1" fontWeight={600} sx={{color:tipo==="baja" ?'#d32f2f' :'#9C27B0'}}>
                        {formatearFechaLarga(fechasSeleccionadas[0])}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    onClick={() => setMostrarListaFechas(!mostrarListaFechas)}
                    sx={{
                      p: 1.5,
                      border: tipo==="baja" ?'1px solid #d32f2f' :'4px solid #9C27B0',
                      bgcolor: '#fff',
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f9f9f9' }
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography fontSize='1.15rem' fontWeight={600} sx={{color:tipo==="baja" ?'#d32f2f' :'#9C27B0'}}>
                         {`Fecha${fechasSeleccionadas.length>1 ? 's ': ' '}`}seleccionadas ({fechasSeleccionadas.length})
                      </Typography>
                      {mostrarListaFechas ? <ExpandLess sx={{fontSize:'1.5rem', color:tipo==="baja" ?'#d32f2f' :'#9C27B0'}} /> : <ExpandMore sx={{fontSize:'1.5rem', color:tipo==="baja" ?'#d32f2f' :'#9C27B0'}}/>}
                    </Box>
                    <Collapse in={mostrarListaFechas}>
                      <Grid container mt={1}>
                        {ordenarFechas(fechasSeleccionadas).map(f => (
                        <Grid key={f} size={{xs:6}}>
                          <Typography fontSize='1.1rem' textAlign={'center'}>
                            • {formatearFechaCorta(f)}
                          </Typography>
                        </Grid>
                        ))}
                      </Grid>
                    </Collapse>
                  </Box>
                )}

                {/* Diferencia con el original */}
                {ausenciaOriginal && fechasSeleccionadas.length !== ausenciaOriginal.fechas.length && (
                  <Alert severity="warning" sx={{ mt: 2, bgcolor:tipo==="baja" ?'rojo.fondo' :'purpura.fondo' }}>
                    <Typography variant="body1" fontWeight={'bold'}>
                      Diferencia: {fechasSeleccionadas.length > ausenciaOriginal.fechas.length ? '+' : ''}
                      {fechasSeleccionadas.length - ausenciaOriginal.fechas.length} día(s)
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/ausencias/solicitudes')}
                disabled={saving}
                sx={{
                  fontSize: '1.3rem',
                  py: 2,
                  borderRadius: 2,
                  borderColor: 'error.main',
                  color: 'error.main',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: 'error.dark',
                    bgcolor: 'error.lighter'
                  }
                }}
              >
                Cancelar
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={
                  !tipo ||
                  !motivo ||
                  fechasSeleccionadas.length === 0 ||
                  saving ||
                  comentariosSolicitante.trim() === ''
                }
                startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
                sx={{
                  fontSize: '1.3rem',
                  py: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #2727b0ff 0%, #281fa2ff 100%)',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(156, 39, 176, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2a1fa2ff 0%, #2a1b9aff 100%)',
                    boxShadow: '0 6px 20px rgba(156, 39, 176, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default EditarAusencia;
