// components/Vacaciones/EditarSolicitudVacaciones.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, FormControl, FormLabel,
  RadioGroup, Radio, FormControlLabel, Alert, CircularProgress,
  Collapse, Chip, Grid
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,  
  ArrowBackIosNew as ArrowBackIosNewIcon,
  EditCalendarOutlined as EditCalendarOutlinedIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearTiempoVacas, formatearTiempoVacasLargo, validarSolicitudVacaciones } from '../../utils/vacacionesUtils';
import { ordenarFechas, esFechaPasadaOHoy, formatearFechaCorta,formatYMD } from '../../utils/dateUtils';
import CalendarioVacaciones from './CalendarioVacaciones';

const EditarSolicitudVacaciones = () => {
  const navigate = useNavigate();
  const { solicitudId } = useParams();
  const { user, userProfile } = useAuthStore();
  const { 
    actualizarSolicitudVacaciones, 
    obtenerSolicitudCompleta,
    loadFestivos, 
    esFechaSeleccionable,
    configVacaciones,
    loadConfigVacaciones
  } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [solicitudOriginal, setSolicitudOriginal] = useState(null);
  const [tipoSolicitud, setTipoSolicitud] = useState('dias');
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);
  const [horasSolicitadas, setHorasSolicitadas] = useState(1);
  const [comentarios, setComentarios] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mostrarListaFechas, setMostrarListaFechas] = useState(false);
  const [valoresOriginales, setValoresOriginales] = useState({
    tipoOriginal: null,
    fechasOriginales: [],
    horasOriginales: 1,
    comentariosOriginales: ''
  });
  const [valoresTemp, setValoresTemp] = useState({
    dias: { fechas: [], comentarios: '' },
    horas: { fechas: [], horas: 1, comentarios: '' }
  });

    useEffect(() => {
      if (!configVacaciones){
      const unsubscribe = loadConfigVacaciones();
      return () => unsubscribe()} // Cleanup al desmontar
    }, [loadConfigVacaciones, configVacaciones]);
  
  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Cargar festivos
        const unsubFestivos = loadFestivos();
        
        // Cargar solicitud
        const solicitud = await obtenerSolicitudCompleta(solicitudId);
        
        // Verificar permisos
        if (solicitud.solicitante !== user?.email) {
          showError('No tienes permisos para editar esta solicitud');
          navigate('/vacaciones/solicitudes');
          return;
        }

        // Verificar que sea editable
        if (solicitud.estado !== 'pendiente' &&  solicitud.estado !== 'aprobada') {
          showError('Solo se pueden editar solicitudes pendientes o aprobadas');
          navigate('/vacaciones/solicitudes');
          return;
        }

        const primeraFecha = solicitud.fechas[0];
        if (esFechaPasadaOHoy(primeraFecha)) {
          showError('No se pueden editar solicitudes con fechas pasadas');
          navigate('/vacaciones/solicitudes');
          return;
        }

        // Establecer datos iniciales
        setSolicitudOriginal(solicitud);
        setFechasSeleccionadas([...solicitud.fechas]);
        setComentarios(solicitud.comentariosSolicitante || '');
        
        // Determinar tipo de solicitud
        const esHoras = solicitud.horasSolicitadas < 8 && solicitud.fechas.length === 1;
        const tipoOriginal = esHoras ? 'horas' : 'dias';
        
        setTipoSolicitud(tipoOriginal);
        setFechasSeleccionadas([...solicitud.fechas]);
        setComentarios(solicitud.comentariosSolicitante || '');
        
        if (esHoras) {
          setHorasSolicitadas(solicitud.horasSolicitadas);
        }
              // ✅ NUEVO: Guardar valores originales
        setValoresOriginales({
          tipoOriginal: tipoOriginal,
          fechasOriginales: [...solicitud.fechas],
          horasOriginales: esHoras ? solicitud.horasSolicitadas : 1,
          comentariosOriginales: solicitud.comentariosSolicitante || ''
        });

        // ✅ NUEVO: Inicializar valores temporales con los originales
        setValoresTemp({
          dias: { 
            fechas: tipoOriginal === 'dias' ? [...solicitud.fechas] : [],
            comentarios: tipoOriginal === 'dias' ? (solicitud.comentariosSolicitante || '') : ''
          },
          horas: { 
            fechas: tipoOriginal === 'horas' ? [...solicitud.fechas] : [],
            horas: tipoOriginal === 'horas' ? solicitud.horasSolicitadas : 1,
            comentarios: tipoOriginal === 'horas' ? (solicitud.comentariosSolicitante || '') : ''
          }
        });

        return unsubFestivos;
      } catch (error) {
        showError('Error al cargar la solicitud: ' + error.message);
        navigate('/vacaciones/solicitudes');
      } finally {
        setLoading(false);
      }
    };

    if (solicitudId && user?.email) {
      cargarDatos();
    }
  }, [solicitudId, user?.email]);


    const horasLibresParaEdicion = useMemo(() => {
      if (!solicitudOriginal && !userProfile) return
    const vacasDisp = userProfile?.vacaciones?.disponibles || 0;
  const vacasPend = userProfile?.vacaciones?.pendientes || 0;

  
  if (solicitudOriginal?.estado === 'pendiente') {
    // Si era pendiente: liberar de pendientes
    return vacasDisp - (vacasPend - solicitudOriginal.horasSolicitadas)
  } else if (solicitudOriginal?.estado === 'aprobada') {
    // Si era aprobada: las horas ya están descontadas de disponibles
    return vacasDisp + solicitudOriginal.horasSolicitadas - vacasPend
  }
    },[solicitudOriginal])

  const horasTotales = tipoSolicitud === 'dias' 
  ? fechasSeleccionadas.length * 8 
  : horasSolicitadas;


  const handleTipoChange = (nuevoTipo) => {
    // Guardar valores actuales en temporal
    const valoresActuales = {
      fechas: [...fechasSeleccionadas],
      comentarios: comentarios,
      ...(tipoSolicitud === 'horas' && { horas: horasSolicitadas })
    };

    setValoresTemp(prev => ({
      ...prev,
      [tipoSolicitud]: valoresActuales
    }));

    // Si volvemos al tipo original, restaurar valores originales
    if (nuevoTipo === valoresOriginales.tipoOriginal) {
      setFechasSeleccionadas([...valoresOriginales.fechasOriginales]);
      setComentarios(valoresOriginales.comentariosOriginales);
      if (nuevoTipo === 'horas') {
        setHorasSolicitadas(valoresOriginales.horasOriginales);
      }
    } else {
      // Si no es el original, usar valores temporales si existen
      const valoresGuardados = valoresTemp[nuevoTipo];
      setFechasSeleccionadas([...valoresGuardados.fechas]);
      setComentarios(valoresGuardados.comentarios);
      if (nuevoTipo === 'horas') {
        setHorasSolicitadas(valoresGuardados.horas);
      }
    }

    setTipoSolicitud(nuevoTipo);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!solicitudOriginal) return;

    const { esValido, errores } = validarSolicitudVacaciones(
      tipoSolicitud, 
      horasSolicitadas, 
      fechasSeleccionadas, 
      horasLibresParaEdicion
    );

    if (!esValido) {
      showError(errores[0]);
      return;
    }

    setSaving(true);
    try {
      const datosActualizados = {
        fechas: ordenarFechas(fechasSeleccionadas),
        horasSolicitadas: horasTotales,
        comentariosSolicitante: comentarios.trim()
      };

      await actualizarSolicitudVacaciones(
        solicitudId,
        datosActualizados,
        solicitudOriginal
      );

      if (solicitudOriginal.estado === 'aprobada') {
      showSuccess('Solicitud actualizada correctamente. Ha vuelto a pendiente para revisión.');
    } else {
      showSuccess('Solicitud actualizada correctamente');
    }
    
    navigate('/vacaciones/solicitudes');
  } catch (err) {
    showError(`Error al actualizar: ${err.message}`);
  } finally {
    setSaving(false);
  }
};

    
  const handleFechasChange = (nuevasFechas) => {
    setFechasSeleccionadas(nuevasFechas);
    
    // Actualizar valores temporales
    setValoresTemp(prev => ({
      ...prev,
      [tipoSolicitud]: {
        ...prev[tipoSolicitud],
        fechas: [...nuevasFechas]
      }
    }));
  };

  const handleComentariosChange = (nuevoComentario) => {
    setComentarios(nuevoComentario);
    
    // Actualizar valores temporales
    setValoresTemp(prev => ({
      ...prev,
      [tipoSolicitud]: {
        ...prev[tipoSolicitud],
        comentarios: nuevoComentario
      }
    }));
  };

  const handleHorasChange = (nuevasHoras) => {
    setHorasSolicitadas(nuevasHoras);
    
    // Actualizar valores temporales para horas
    if (tipoSolicitud === 'horas') {
      setValoresTemp(prev => ({
        ...prev,
        horas: {
          ...prev.horas,
          horas: nuevasHoras
        }
      }));
    }
  };


  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Cargando solicitud...
        </Typography>
      </Container>
    );
  }

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
            onClick={() => navigate('/vacaciones/solicitudes')}
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
            >Editar Solicitud
            </Typography>
            <Typography 
                variant="caption" 
                sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
                }}
            >
              Modifica tu petición de vacaciones
            </Typography>
          </Box>
          <EditCalendarOutlinedIcon sx={{ fontSize: '2rem' }} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ pb: 4 }}>

        <form onSubmit={handleSubmit}>
          {/* Tipo de solicitud */}
          <Card sx={{ mb: 3, mt:2 }}>
            <CardContent>
                {/* Información original */}
                {solicitudOriginal && solicitudOriginal.estado === 'aprobada' && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Atención:</strong> Esta solicitud ya fue aprobada. Al editarla:
                  </Typography>
                  <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                    <li>Volverá a estado "pendiente"</li>
                    <li>Necesitará nueva aprobación del administrador</li>
                    <li>Las horas volverán a disponibles temporalmente</li>
                  </Box>
                </Alert>
              )}
                {solicitudOriginal && (
                <Alert severity="info" sx={{}}>
                    <Typography variant="body1">
                    <strong>Solicitud original:</strong> {formatearTiempoVacasLargo(solicitudOriginal.horasSolicitadas)}
                    </Typography>
                </Alert>
                )}

                {/* Saldo disponible */}
                <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body1">
                Disponibles para esta edición: 
                <br/>
                <strong>{formatearTiempoVacasLargo(horasLibresParaEdicion)}</strong>
                </Typography>
                </Alert>
              <FormControl>
                <FormLabel sx={{ mb: 2, fontWeight: 600 }}>Tipo de solicitud</FormLabel>
                <RadioGroup
                  value={tipoSolicitud}
                  onChange={(e) => handleTipoChange(e.target.value)}
                  sx={{ flexDirection: 'row', gap: 2 }}>
                  <FormControlLabel 
                    value="dias" 
                    control={<Radio />} 
                    label={
                      <Box>
                        <Typography variant="body1">Días completos</Typography>
                        {/* Mostrar indicador si es el tipo original */}
                        {valoresOriginales.tipoOriginal === 'dias' && (
                          <Typography variant="caption" color="primary.main">
                            (Original)
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <FormControlLabel 
                    value="horas" 
                    control={<Radio disabled={horasLibresParaEdicion === 0} />}
                    label={
                      <Box>
                        <Typography 
                          variant="body1" 
                          color={horasLibresParaEdicion === 0 ? 'text.disabled' : 'inherit'}
                        >
                          Horas sueltas
                        </Typography>
                        {/*  Mostrar indicador si es el tipo original */}
                        {valoresOriginales.tipoOriginal === 'horas' && horasLibresParaEdicion > 0 && (
                          <Typography variant="caption" color="primary.main">
                            (Original)
                          </Typography>
                        )}
                        {horasLibresParaEdicion === 0 && (
                          <Typography variant="caption" color="text.disabled">
                            Sin horas disponibles
                          </Typography>
                        )}
                      </Box>
                    }
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
                  value={horasSolicitadas}
                  onChange={e => {
                    const value = e.target.value;
                    const numValue = parseInt(value);
                    const maxHoras = Math.min(7, horasLibresParaEdicion);
                    
                    if (value === '' || (numValue >= 1 && numValue <= maxHoras)) {
                      const nuevasHoras = value === '' ? '' : numValue;
                      handleHorasChange(nuevasHoras);
                    }
                  }}
                  slotProps={{ 
                    htmlInput: {
                      min: 1, 
                      max: Math.min(7, horasLibresParaEdicion)
                    }
                  }}
                  helperText={`Máximo ${Math.min(7, horasLibresParaEdicion)}h disponibles`}
                />
              </CardContent>
            </Card>
          )}

          {/* Calendario */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <CalendarioVacaciones
                tipoSolicitud={tipoSolicitud}
                fechasSeleccionadas={fechasSeleccionadas}
                onFechasChange={handleFechasChange}
                esFechaSeleccionable={esFechaSeleccionable}
                horasLibres={horasLibresParaEdicion}
              />
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <TextField
                label="Comentarios (opcional)"
                rows={3}
                multiline
                fullWidth
                value={comentarios}
                onChange={e =>  handleComentariosChange(e.target.value)}
                placeholder="Ej: necesito salir 2 h antes…"
              />
            </CardContent>
          </Card>

          {/* Resumen de cambios */}
          {fechasSeleccionadas.length > 0 && (
            <Card  sx={{ mb: 3, bgcolor: 'azul.fondo', border:'1px solid black' }}>
              <CardContent>
                <Typography variant="h5" fontWeight='bold' textAlign='center' gutterBottom>
                  Resumen de cambios
                </Typography>
          
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
                {tipoSolicitud === 'horas'
                    ? <Typography variant="h5" sx={{mt:1}} textAlign="center" fontWeight={600}>{formatearFechaCorta(fechasSeleccionadas[0])}</Typography>
                    : fechasSeleccionadas.length===1 
                      ? (<><Typography variant="h5" sx={{mt:1}} textAlign="center" fontWeight={600}>{formatearFechaCorta(fechasSeleccionadas[0])}</Typography></>)
                      :(

                    
                      <Box display="flex" sx={{mt:1}} flexDirection="column" alignItems="center">
                          <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              onClick={() => setMostrarListaFechas(!mostrarListaFechas)}
                              sx={{
                                  mt: 0.5,
                                  p: 1,
                                  px:2,
                                  border: '1px solid',
                                  borderColor: 'azul.main',
                                  bgcolor: 'azul.fondo', // Un fondo para que parezca un chip
                                  borderRadius: 3,
                                  cursor: 'pointer',
                                  '&:hover': {
                                  bgcolor: 'azul.fondoFuerte',
                                  },
                              }}
                              >
                              <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                              <Typography fontSize='1.1rem' fontWeight={600}>
                                  {`Fecha${fechasSeleccionadas.length>1 ? 's ': ' '}`}seleccionadas ({fechasSeleccionadas.length})
                              </Typography>
                              <IconButton  >
                                  {mostrarListaFechas 
                                  ? <ExpandLess sx={{fontSize:'1.8rem', color:'black'}}/> 
                                  : <ExpandMore sx={{fontSize:'1.8rem', color:'black'}} />}
                              </IconButton>
                              </Box>
                              </Box>
                          <Collapse in={mostrarListaFechas}>
                          <Box sx={{ mt: 1 }}>
                              {ordenarFechas(fechasSeleccionadas).map(f => (
                              <Typography key={f} variant="h5" display="block">• {formatearFechaCorta(f)}</Typography>
                              ))}
                          </Box>
                          </Collapse>
                      </Box>
                      )
                 }
                </Grid>

                  <Grid size={{ xs:12, sm:6 }}>
                    <Typography fontSize='1.25rem' textAlign="center" >
                        {tipoSolicitud === 'horas' ? 'Nuevo total horas solicitadas' : 'Nuevo total días solicitados'}
                        </Typography>
                    <Typography variant="h6" textAlign="center" fontWeight={600} sx={{mt:0}}>
                        {formatearTiempoVacasLargo(horasTotales)}</Typography>
                  </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography fontSize='1.25rem' textAlign="center">Vacaciones tras aprobación</Typography>
                  <Typography variant="h6" textAlign="center" sx={{}} fontWeight={600}>
                      {formatearTiempoVacasLargo(horasLibresParaEdicion-horasTotales)}      
                  </Typography>         
              </Grid>
                </Grid>

                {horasTotales > horasLibresParaEdicion && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    No tienes suficientes horas disponibles para este cambio
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Botones */}
          <Box sx={{ display: 'flex', justifyContent:"space-between" }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/vacaciones/solicitudes')}
              disabled={saving}
              sx={{
                fontSize: '1.2rem',
                py: 2,                
                borderRadius: 2,
                borderColor:'rojo.main',
                color:'rojo.main',
                fontWeight: 600,
                textTransform: 'none'
              }}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              disabled={saving || fechasSeleccionadas.length === 0 || horasTotales > horasLibresParaEdicion}           
              sx={{
                fontSize: '1.2rem',                
                borderRadius: 2,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 4px 15px rgba(251, 140, 0, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1976D2 0%, #2196F3 100%)',
                  boxShadow: '0 6px 20px rgba(251, 140, 0, 0.4)',
                  transform: 'translateY(-2px)'
                },
                '&:disabled': {
                  background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
                },
                transition: 'all 0.3s ease'
              }}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </Box>
        </form>
      </Container>
    </>
  );
};

export default EditarSolicitudVacaciones;
