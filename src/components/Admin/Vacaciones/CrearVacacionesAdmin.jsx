// components/Admin/Vacaciones/CrearVacacionesAdmin.jsx

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, Alert, CircularProgress, Collapse,
  FormControl, InputLabel, Select, MenuItem, Grid, Divider, FormLabel,
  RadioGroup, Radio, FormControlLabel
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  Save as SaveIcon,
  PostAddOutlined as PostAddOutlinedIcon,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';

import { useAuthStore } from '../../../stores/authStore';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useEmpleadosStore } from '../../../stores/empleadosStore';
import { useUIStore } from '../../../stores/uiStore';
import { ordenarFechas, formatearFechaCorta} from '../../../utils/dateUtils';
import { formatearNombre } from '../../Helpers';
import { formatearTiempoVacasLargo, validarSolicitudVacaciones } from '../../../utils/vacacionesUtils';
import CalendarioVacaciones from '../../Vacaciones/CalendarioVacaciones';

const CrearVacacionesAdmin = () => {
  const navigate = useNavigate();
  const { isAdminOrOwner } = useAuthStore();
  const { 
    loadFestivos, 
    esFechaSeleccionable, 
    loadSolicitudesVacaciones,
    solicitudesVacaciones,
  } = useVacacionesStore();
  const { empleados, fetchEmpleados, fetchEmpleadoPorEmail } = useEmpleadosStore();
  const { showSuccess, showError } = useUIStore();

  // Verificar que sea admin
  useEffect(() => {
    if (!isAdminOrOwner) {
      showError('No tienes permisos para acceder a esta página');
      navigate('/');
    }
  }, [isAdminOrOwner]);

  // Estados principales
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [empleadoData, setEmpleadoData] = useState(null);
  const [tipoSolicitud, setTipoSolicitud] = useState('dias');
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);
  const [horasSolicitadas, setHorasSolicitadas] = useState(1);
  const [comentariosSolicitante, setComentariosSolicitante] = useState('');
  const [comentariosAdmin, setComentariosAdmin] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mostrarListaFechas, setMostrarListaFechas] = useState(false);

  // Calcular horas disponibles reales (disponibles - pendientes)
  const vacasDisp = empleadoData?.vacaciones?.disponibles || 0;
  const vacasPend = empleadoData?.vacaciones?.pendientes || 0;
  const horasLibresReal = vacasDisp - vacasPend;

  // Mantener referencia estable del saldo durante guardado
  const horasLibresRef = useRef(horasLibresReal);
  if (!saving) {
    horasLibresRef.current = horasLibresReal;
  }
  const horasLibres = saving ? horasLibresRef.current : horasLibresReal;

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        // Cargar festivos
        const unsubFestivos = loadFestivos();
        // Cargar empleados
        const unsubEmpleados = fetchEmpleados();

        return () => {
          if (typeof unsubFestivos === 'function') unsubFestivos();
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

  // Cargar solicitudes del empleado cuando se selecciona uno
  useEffect(() => {
    if (!empleadoSeleccionado) return;
    
    const unsub = loadSolicitudesVacaciones(empleadoSeleccionado);
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [empleadoSeleccionado, loadSolicitudesVacaciones]);

  // Obtener datos completos del empleado cuando se selecciona
  useEffect(() => {
    const cargarEmpleado = async () => {
      if (!empleadoSeleccionado) {
        setEmpleadoData(null);
        return;
      }

      try {
        const data = await fetchEmpleadoPorEmail(empleadoSeleccionado);
        setEmpleadoData(data);
      } catch (error) {
        showError(`Error al cargar datos del empleado. ${error.message}`);
        setEmpleadoData(null);
      }
    };

    cargarEmpleado();
  }, [empleadoSeleccionado, fetchEmpleadoPorEmail]);

  // Calcular fechas ya pedidas (para bloquearlas en el calendario)
  const fechasYaPedidasSet = useMemo(() => {
    const set = new Set();
    
    solicitudesVacaciones
      .filter(s => (s.estado === 'aprobada'|| s.estado==='cancelado'))
      .forEach(s => {
        s.fechasActuales?.forEach(f => {
          set.add(f);
        });
      });
    
    return set;
  }, [solicitudesVacaciones]);

  // Calcular horas totales
  const horasTotales = tipoSolicitud === 'dias' 
    ? fechasSeleccionadas.length * 8 
    : horasSolicitadas;

  // Validación y envío
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!empleadoSeleccionado) {
      showError('Debes seleccionar un empleado');
      return;
    }

    const validacion = validarSolicitudVacaciones(
      tipoSolicitud,
      horasSolicitadas,
      fechasSeleccionadas,
      horasLibres
    );

    if (!validacion.esValido) {
      showError(validacion.errores[0]);
      return;
    }

    if (!comentariosAdmin.trim()) {
      showError('Debes explicar el motivo en los comentarios de administración');
      return;
    }

    setSaving(true);
    try {
      // Crear solicitud usando la función existente del store
      const { crearSolicitudVacaciones } = useVacacionesStore.getState();
      
      const solicitudData = {
        solicitante: empleadoSeleccionado,
        fechas: ordenarFechas(fechasSeleccionadas),
        horasSolicitadas: horasTotales,
        comentariosSolicitante: comentariosSolicitante.trim() || '',
        comentariosAdmin: comentariosAdmin.trim()
      };

      // Crear la solicitud con estado aprobado directamente
      const solicitudId = await crearSolicitudVacaciones(solicitudData,true); // El segundo parámetro indica que es creación por admin

      showSuccess(
        `Solicitud creada y aprobada para ${formatearNombre(empleadoData?.nombre || empleadoSeleccionado)}`
      );
      navigate('/admin/vacaciones');
    } catch (err) {
      showError('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={60} sx={{ color: '#FB8C00' }} />
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
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
          boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/admin/vacaciones')}
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

          <Box sx={{ my: 0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' }, lineHeight: 1.2 }}
            >
              Crear Solicitud de Vacaciones
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Crea y aprueba automáticamente
            </Typography>
          </Box>

          <IconButton edge="end" color="inherit" sx={{ cursor: 'default' }}>
            <PostAddOutlinedIcon sx={{ fontSize: '2rem' }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ pb: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {/* Selección de empleado */}
          <Card elevation={2} sx={{ mb: 3, mt: 2 }}>
            <CardContent>
              <Typography fontSize="1.2rem" fontWeight={600} mb={1} textAlign="center">
                Selecciona el empleado
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Empleado</InputLabel>
                <Select
                  value={empleadoSeleccionado}
                  onChange={(e) => {
                    setEmpleadoSeleccionado(e.target.value);
                    setFechasSeleccionadas([]);
                    setHorasSolicitadas(1);
                  }}
                  label="Empleado"
                  required
                >
                  {empleados
                    .filter(emp => emp.rol !== 'owner') // Excluir owner si quieres
                    .map((emp, index) => (
                      <MenuItem 
                        key={emp.email} 
                        value={emp.email}
                        sx={{ bgcolor: index % 2 === 0 ? 'grey.100' : 'inherit' }}
                      >
                        <Typography width="100%" variant="body1" fontWeight={600}>
                          {emp.nombre}
                        </Typography>
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              {/* Mostrar saldo si hay empleado seleccionado */}
              {empleadoSeleccionado && empleadoData && (
                <Box textAlign="center" sx={{ p:2, bgcolor: horasLibres > 0 ? "azul.fondo" : "naranja.fondo", borderRadius:3  }} >
                    <Typography variant="h6" textAlign="center" fontWeight={500}>
                  Vacaciones Disponibles
                    </Typography>
                    <Typography variant="h5" textAlign="center" fontWeight={600}>
                    {formatearTiempoVacasLargo(horasLibres)}
                    </Typography>
                  {horasLibres <= 0 && (
                    <Typography variant='h6' fontWeight={600} sx={{ lineHeight: 1.2, textAlign: 'center', mt: 0.5, color: 'error.main' }}>
                      Este empleado no tiene vacaciones disponibles
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Solo mostrar el resto si hay empleado seleccionado */}
          {empleadoSeleccionado && empleadoData && (
            <>
              {/* Tipo de solicitud */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <FormControl>
                    <FormLabel sx={{ mb: 1, fontWeight: 600, textAlign: 'center' }}>
                      Tipo de solicitud
                    </FormLabel>
                    <RadioGroup
                      value={tipoSolicitud}
                      onChange={(e) => {
                        setTipoSolicitud(e.target.value);
                        setFechasSeleccionadas([]);
                        setHorasSolicitadas(1);
                      }}
                      sx={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between'
                      }}
                    >
                      <FormControlLabel value="dias" control={<Radio />} label="Días completos" />
                      <FormControlLabel 
                        value="horas" 
                        control={<Radio />} 
                        disabled={horasLibres <= 0}
                        label="Horas sueltas" 
                      />
                    </RadioGroup>
                  </FormControl>
                </CardContent>
              </Card>

              {/* Horas sueltas */}
              {tipoSolicitud === 'horas' && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <TextField
                      label="Horas a solicitar"
                      type="number"
                      fullWidth
                      helperText={`Máximo: ${Math.min(7, horasLibres)}h`}
                      value={horasSolicitadas}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => {
                        const value = e.target.value;
                        const maxHoras = Math.min(7, horasLibres);
                        if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= maxHoras)) {
                          setHorasSolicitadas(value ? parseInt(value) : '');
                        }
                      }}
                      slotProps={{
                        htmlInput: {
                          min: 1,
                          max: Math.min(7, horasLibres)
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Calendario */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <CalendarioVacaciones
                    fechasSeleccionadas={fechasSeleccionadas}
                    onFechasChange={setFechasSeleccionadas}
                    tipoSolicitud={tipoSolicitud}
                    esFechaSeleccionable={esFechaSeleccionable}
                    horasLibres={horasLibres}
                    fechasYaPedidasSet={fechasYaPedidasSet}
                    esAdmin={true} // 🔑 Permitir seleccionar días pasados
                  />
                </CardContent>
              </Card>

              {/* Comentarios del empleado (opcional) */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography fontSize="1.2rem" fontWeight={600} mb={1} textAlign="center">
                    Comentarios del empleado
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    value={comentariosSolicitante}
                    onChange={(e) => setComentariosSolicitante(e.target.value)}
                    placeholder="(opcional) Información adicional del empleado..."
                  />
                </CardContent>
              </Card>

              {/* Comentarios admin (obligatorio) */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography fontSize="1.2rem" fontWeight={600} mb={1} textAlign="center">
                    Comentarios de administración*
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    required
                    value={comentariosAdmin}
                    onChange={(e) => setComentariosAdmin(e.target.value)}
                    placeholder="Obligatorio. Ej: Vacaciones registradas por administración debido a..."
                  />
                </CardContent>
              </Card>

              {/* Resumen */}
              {fechasSeleccionadas.length > 0 && (
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  <Grid size={{ xs: 5, md: 2 }} sx={{ display: 'flex' }}>
                    <Card sx={{ p: 2, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Typography fontSize='1.15rem' textAlign="center">
                        {tipoSolicitud === 'horas' ? 'Total horas' : 'Total Días'}
                      </Typography>
                      <Typography variant="h6" textAlign="center" fontWeight={600} sx={{ mt: 1 }}>
                        {formatearTiempoVacasLargo(horasTotales)}
                      </Typography>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 7, md: 4 }} sx={{ display: 'flex' }}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography fontSize='1.15rem' textAlign="center" lineHeight='1.2'>
                        Vacaciones tras aprobación
                      </Typography>
                      <Typography variant="h6" textAlign="center" sx={{ mt: 1 }} fontWeight={600}>
                        {formatearTiempoVacasLargo(horasLibres - horasTotales)}
                      </Typography>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 2 }}>
                      {(tipoSolicitud === 'horas' || fechasSeleccionadas.length === 1) ? (
                        <Typography variant="h5" sx={{  }} textAlign="center" fontWeight={600}>
                          {formatearFechaCorta(fechasSeleccionadas[0])}
                        </Typography>
                      
                      ) : (
                        <>
                        <Box display="flex" sx={{ }} flexDirection="column" alignItems="center">
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            onClick={() => setMostrarListaFechas(!mostrarListaFechas)}
                            sx={{                        
                              p: 1,
                              px: 2,
                              border: '1px solid',
                              borderColor: 'verde.main',
                              bgcolor: 'verde.fondo',
                              borderRadius: 3,
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'verde.fondoFuerte' }
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography fontSize="1.2rem" fontWeight={600}>
                                Fecha{fechasSeleccionadas.length > 1 ? 's' : ''} seleccionadas ({fechasSeleccionadas.length})
                              </Typography>
                              <IconButton>
                                {mostrarListaFechas ? (
                                  <ExpandLess sx={{ fontSize: '1.8rem', color: 'black' }} />
                                ) : (
                                  <ExpandMore sx={{ fontSize: '1.8rem', color: 'black' }} />
                                )}
                              </IconButton>
                            </Box>
                          </Box>
                         </Box>

                          <Collapse in={mostrarListaFechas}>
                            <Grid container sx={{ mt: 1 }}>
                              {ordenarFechas(fechasSeleccionadas).map(f => (
                                <Grid key={f} size={{ xs: 6 }}>
                                    <Box sx={{display:'flex', justifyContent:'center'}}>
                                  <Typography variant="h6" textAlign="center">
                                    {formatearFechaCorta(f)}
                                  </Typography>
                                  </Box>
                                </Grid>
                              ))}
                            </Grid>
                          </Collapse>
                          </>
                      )}
                    </Card>
                  </Grid>

                  {horasTotales > horasLibres && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      No hay suficientes horas disponibles
                    </Alert>
                  )}
                </Grid>
              )}

              {/* Botones de acción */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate('/admin/vacaciones')}
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
                    disabled={
                      !empleadoSeleccionado ||
                      !comentariosAdmin.trim() ||
                      fechasSeleccionadas.length === 0 ||
                      horasTotales > horasLibres ||
                      saving
                    }
                    startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
                    sx={{
                      fontSize: '1.3rem',
                      py: 2,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #43A047 0%, #388E3C 100%)',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 4px 15px rgba(67, 160, 71, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #388E3C 0%, #2E7D32 100%)',
                        boxShadow: '0 6px 20px rgba(67, 160, 71, 0.4)',
                        transform: 'translateY(-2px)'
                      },
                      '&:disabled': {
                        background: 'linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {saving ? 'Creando y aprobando...' : 'Crear y aprobar solicitud'}
                  </Button>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Container>
    </>
  );
};

export default CrearVacacionesAdmin;
