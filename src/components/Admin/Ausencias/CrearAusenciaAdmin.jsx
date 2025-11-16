// components/Admin/Ausencias/CrearAusenciaAdmin.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, Alert, CircularProgress, Collapse,
  FormControl, InputLabel, Select, MenuItem, Grid, Divider, Chip
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  AddCircleOutline as AddIcon,
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon,
  PostAddOutlined as PostAddOutlinedIcon,
    ExpandMore,
    ExpandLess
} from '@mui/icons-material';
import { useAuthStore } from '../../../stores/authStore';
import { useAusenciasStore } from '../../../stores/ausenciasStore';
import { useEmpleadosStore } from '../../../stores/empleadosStore';
import { useUIStore } from '../../../stores/uiStore';
import { ordenarFechas, formatearFechaCorta } from '../../../utils/dateUtils';
import { formatearNombre } from '../../Helpers';
import CalendarioAusencias from '../../Ausencias/CalendarioAusencias';

const CrearAusenciaAdmin = () => {
  const navigate = useNavigate();
  const { user, isAdminOrOwner } = useAuthStore();
  const { crearAusencia, motivosPermisos, motivosBajas, loadConfigAusencias } = useAusenciasStore();
  const { empleados, fetchEmpleados } = useEmpleadosStore(); 
  const { showSuccess, showError } = useUIStore();

  // Verificar que sea admin
  useEffect(() => {
    if (!isAdminOrOwner()) {
      showError('No tienes permisos para acceder a esta página');
      navigate('/');
    }
  }, [isAdminOrOwner]);

  // Estados principales
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [tipo, setTipo] = useState('permiso');
  const [motivo, setMotivo] = useState('');
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);
  const [comentariosSolicitante, setComentariosSolicitante] = useState('');
  const [comentariosAdmin, setComentariosAdmin] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mostrarListaFechas, setMostrarListaFechas] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Cargar festivos y configuración
        const unsubConfig = loadConfigAusencias();

        // Cargar empleados
        const unsubEmpleados = fetchEmpleados();

        return () => {
          if (typeof unsubConfig === 'function') unsubConfig();
          if (typeof unsubEmpleados === 'function') unsubEmpleados();
        };
      } catch (error) {
        showError('Error al cargar datos: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Manejar cambio de tipo
  const handleTipoChange = (nuevoTipo) => {
    setTipo(nuevoTipo);
    setMotivo(''); // Resetear motivo al cambiar tipo
  };

  // Validación y envío
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!empleadoSeleccionado) {
      showError('Debes seleccionar un empleado');
      return;
    }

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

    if (comentariosAdmin.trim() === '') {
      showError('Debes explicar el motivo de la ausencia en los comentarios de administración');
      return;
    }

    setSaving(true);
    try {
      const ausenciaData = {
        solicitante: empleadoSeleccionado,
        tipo: tipo,
        motivo: motivo,
        fechas: fechasSeleccionadas,
        comentariosSolicitante: comentariosSolicitante.trim(),
        comentariosAdmin: comentariosAdmin.trim() || 'Ausencia registrada por administración'
      };

      await crearAusencia(ausenciaData, true); // true = esAdmin

      showSuccess(`${tipo === 'baja' ? 'Baja' : 'Permiso'} creado correctamente para ${formatearNombre(empleados.find(e => e.email === empleadoSeleccionado)?.nombre || empleadoSeleccionado)}`);
      navigate('/admin/ausencias/historial');
    } catch (err) {
      showError(`Error al crear la ausencia: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={60} sx={{ color: '#9C27B0' }} />
        <Typography variant="h6" ml={2}>
          Cargando...
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
            Crear Permisos y Bajas
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              opacity: 0.9,
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            Crea una ausencia para un empleado
          </Typography>
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          sx={{
            cursor: 'default'
          }}
        >
          <PostAddOutlinedIcon sx={{fontSize:'2rem'}}/>
        </IconButton>

      </Toolbar>
    </AppBar>

      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>

          {/* Card principal */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              {/* Selección de empleado */}
              <Typography fontSize={'1.2rem'} fontWeight={600} mb={1} textAlign={'center'}>
                Selecciona el empleado
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Empleado</InputLabel>
                <Select
                  value={empleadoSeleccionado}
                  onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                  label="Empleado"
                  required
                >
                  {empleados
                    .filter(emp => emp.rol !== 'owner') // Excluir owner si quieres
                    .map((emp, index) => (
                        <MenuItem key={emp.email} value={emp.email} sx={{bgcolor:index%2===0?'grey.100':'inherit'}}>
                        <Typography  width='100%' variant="body1" fontWeight={600}>
                          {emp.nombre}
                        </Typography>
                      
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider sx={{ my: 2 }} />

              {/* Tipo de ausencia */}
              <Typography fontSize={'1.2rem'} fontWeight={600} mb={1} textAlign={'center'}>
                Tipo de ausencia
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6 }}>
                  <Button
                    fullWidth
                    variant={tipo === 'permiso' ? 'contained' : 'outlined'}
                    onClick={() => handleTipoChange('permiso')}
                    sx={{
                      py: 2,
                      fontSize:'1.05rem',
                      borderRadius: 2,
                      bgcolor: tipo === 'permiso' ? 'purpura.main' : 'transparent',
                      color: tipo === 'permiso' ? 'white' : 'black',
                      borderColor: 'purpura.main',
                      '&:hover': {
                        bgcolor: tipo === 'permiso' ? 'purpura.main' : 'transparent',
                        borderColor: 'purpura.main'
                      }
                    }}
                  >
                    Permiso
                  </Button>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Button
                    fullWidth
                    variant={tipo === 'baja' ? 'contained' : 'outlined'}
                    onClick={() => handleTipoChange('baja')}
                    sx={{
                      py: 2,
                      fontSize:'1.05rem',
                      borderRadius: 2,
                      bgcolor: tipo === 'baja' ? 'rojo.main' : 'transparent',
                      color: tipo === 'baja' ? 'white' : 'black',
                      borderColor: 'error.main',
                      '&:hover': {
                        bgcolor: tipo === 'baja' ? 'rojo.main' : 'transparent',
                        borderColor: 'error.main'
                      }
                    }}
                  >
                    Baja
                  </Button>
                </Grid>
              </Grid>

              {/* Motivo */}
              <Typography fontSize={'1.2rem'} fontWeight={600} mb={1} textAlign={'center'}>
                Motivo
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Motivo</InputLabel>
                <Select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  label="Motivo"
                  required
                >
                  {(tipo === 'permiso' ? motivosPermisos : motivosBajas).map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Selector de fechas */}
              <Typography fontSize={'1.2rem'} fontWeight={600} mb={1} textAlign={'center'}>
                Fechas de la ausencia
              </Typography>

              <Box
                sx={{
                  borderRadius: 2,
                  p: 1,
                  bgcolor: '#fafafa',
                  mb: 3
                }}
              >
                <CalendarioAusencias
                  fechasSeleccionadas={fechasSeleccionadas}
                  onFechasChange={setFechasSeleccionadas}
                  esAdmin={true} // Sin restricciones de días pasados
                />
              </Box>

              {/* Comentarios del empleado (opcional) */}
              <Typography fontSize={'1.2rem'} fontWeight={600} mb={1} textAlign={'center'}>
                Comentarios del empleado
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={comentariosSolicitante}
                onChange={(e) => setComentariosSolicitante(e.target.value)}
                placeholder="(opcional) Información adicional proporcionada por el empleado..."
                sx={{ mb: 3 }}
              />

              {/* Comentarios admin */}
              <Typography fontSize={'1.2rem'} fontWeight={600} mb={1} textAlign={'center'}>
                Comentarios de administración
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                required
                value={comentariosAdmin}
                onChange={(e) => setComentariosAdmin(e.target.value)}
                placeholder="Ej: Ausencia registrada por administración debido a..."
                sx={{ mb: 2 }}
              />
            </CardContent>
          </Card>

          {/* Resumen */}
          {fechasSeleccionadas.length > 0 && empleadoSeleccionado && (
             <Card elevation={3} sx={{ mb: 3, borderLeft: tipo==="baja" ? '5px solid #d32f2f' :'5px solid #9C27B0' }}>
                <CardContent>
                <Typography variant="h6" textAlign='center' fontWeight={700} mb={2} sx={{color:tipo==="baja" ?'#d32f2f' :'#9C27B0'}}>
                    Resumen
                </Typography>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1" color="">Empleado:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatearNombre(empleados.find(e => e.email === empleadoSeleccionado)?.nombre || empleadoSeleccionado)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1" >Tipo:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {tipo === 'permiso' ? '🟣 Permiso' : '🔴 Baja'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1" >Motivo:</Typography>
                  <Typography variant="body1" fontWeight={600}>{motivo}</Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body1" >Total días:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {fechasSeleccionadas.length} día{fechasSeleccionadas.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                {/* Lista de fechas */}
                {fechasSeleccionadas.length === 1 ? (
                  <Box textAlign="center" py={1}>
                    <Typography variant="body1"  textAlign='center' fontWeight={600} sx={{color:tipo==="baja" ?'#d32f2f' :'#9C27B0'}}>
                      {formatearFechaCorta(fechasSeleccionadas[0])}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    onClick={() => setMostrarListaFechas(!mostrarListaFechas)}
                    sx={{
                      p: 1.5,
                      border: tipo==="baja" ?'3px solid #d32f2f' :'3px solid #9C27B0',
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
                      {mostrarListaFechas ? <ExpandLess sx={{fontSize:'1.5rem', color:tipo==="baja" ?'#d32f2f' :'#9C27B0'}}/> : <ExpandMore sx={{fontSize:'1.5rem', color:tipo==="baja" ?'#d32f2f' :'#9C27B0'}} />}
                    </Box>
                    <Collapse in={mostrarListaFechas}>
                      <Grid container mt={1}>
                        {ordenarFechas(fechasSeleccionadas).map(f => (
                          <Grid key={f} size={{xs:6}}>
                          <Typography  fontSize='1.1rem' textAlign={'center'}>
                            • {formatearFechaCorta(f)}
                          </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Collapse>
                  </Box>
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
                onClick={() => navigate('/admin/ausencias')}
                disabled={saving}
                sx={{
                  fontSize: '1.1rem',
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
                disabled={!empleadoSeleccionado || comentariosAdmin.trim()==="" || !tipo || !motivo || fechasSeleccionadas.length === 0 || saving}
                startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
                sx={{
                    fontSize: '1.3rem',
                    py: 2,
                    borderRadius: 3,
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
                {saving ? 'Registrando...' : 'Registrar ausencia'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default CrearAusenciaAdmin;
