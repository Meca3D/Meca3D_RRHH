// components/Vacaciones/CrearSolicitudVacaciones.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, FormControl, FormLabel,
  RadioGroup, Radio, FormControlLabel, Alert, CircularProgress,
  Collapse, Grid
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  PostAddOutlined as PostAddOutlinedIcon,
  ExpandLess,
  ExpandMore,
  EditCalendarOutlined as EditCalendarOutlinedIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearTiempoVacas, formatearTiempoVacasLargo, validarSolicitudVacaciones } from '../../utils/vacacionesUtils';
import { ordenarFechas, formatearFechaCorta } from '../../utils/dateUtils';
import CalendarioVacaciones from './CalendarioVacaciones';

const CrearSolicitudVacaciones = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { crearSolicitudVacaciones, loadFestivos, esFechaSeleccionable, configVacaciones,loadConfigVacaciones } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  const [tipoSolicitud, setTipoSolicitud] = useState('dias');
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);
  const [horasSolicitadas, setHorasSolicitadas] = useState(1);
  const [comentarios, setComentarios] = useState('');
  const [saving, setSaving] = useState(false);
  const [mostrarListaFechas, setMostrarListaFechas] = useState(false);

  const vacasDisp = userProfile?.vacaciones?.disponibles || 0;
  const vacasPend = userProfile?.vacaciones?.pendientes || 0;
  const horasLibres = vacasDisp - vacasPend;

  useEffect(() => {
    if (!configVacaciones){
    const unsubscribe = loadConfigVacaciones();
    return () => unsubscribe();} // Cleanup al desmontar
  }, [loadConfigVacaciones, configVacaciones]);

  useEffect(() => {
    const unsub = loadFestivos();
    return () => unsub && unsub();
  }, [loadFestivos]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { esValido, errores } = validarSolicitudVacaciones(
      tipoSolicitud, 
      horasSolicitadas, 
      fechasSeleccionadas, 
      horasLibres
    );

    if (!esValido) {
      showError(errores[0]);
      return;
    }

    setSaving(true);
    try {
      const horasTotales = tipoSolicitud === 'dias' 
        ? fechasSeleccionadas.length * 8 
        : horasSolicitadas;

      await crearSolicitudVacaciones({
        solicitante: user.email,
        fechas: ordenarFechas(fechasSeleccionadas),
        horasSolicitadas: horasTotales,
        comentariosSolicitante: comentarios.trim()
      });

      showSuccess('Solicitud creada correctamente');
      navigate('/vacaciones');
    } catch (err) {
      showError(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const horasTotales = tipoSolicitud === 'dias' 
    ? fechasSeleccionadas.length * 8 
    : horasSolicitadas;

  return (
    <>
      {/* AppBar */}
      <AppBar
        sx={{ 
          background: 'linear-gradient(135deg, #FB8C00 0%, #F57C00 50%, #EF6C00 100%)',
          boxShadow: '0 2px 10px rgba(251, 140, 0, 0.2)',
            zIndex: 1100,
            overflow:'hidden' }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton edge="start" color="inherit"
            onClick={() => navigate('/vacaciones')}
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
                    lineHeight: 1.2,
                }}
                >
                Crear Solicitud
            </Typography>
            <Typography 
                    variant="caption" 
                    sx={{ 
                    opacity: 0.9,
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                    }}
                >
                Elige las fechas de Vacaciones
            </Typography>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            sx={{
            cursor: 'default',
            }}
        >
            <PostAddOutlinedIcon sx={{ fontSize: '2rem' }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ px:1, pb: 4 }}>


        <form onSubmit={handleSubmit}>
          {/* Tipo */}
          <Card sx={{ mb: 3, mt:2 }}>
            <CardContent>
              {/* Saldo */}
              <Alert severity="warning" sx={{ fontSize:'1rem', mb: 3 }}>
                Vacaciones Disponibles: <strong>{formatearTiempoVacas(horasLibres)}</strong> 
              </Alert>
              <FormControl>
                <FormLabel sx={{ mb: 2, fontWeight: 600 }}>Tipo de solicitud</FormLabel>
                <RadioGroup
                  value={tipoSolicitud}
                  onChange={(e) => {
                    setTipoSolicitud(e.target.value);
                    setFechasSeleccionadas([]);
                    setHorasSolicitadas(1);
                  }}
                  sx={{ flexDirection: 'row', gap: 2 }}>
                  <FormControlLabel value="dias" control={<Radio />} label="Días completos" />
                  <FormControlLabel value="horas"control={<Radio disabled={horasLibres === 0} />} label="Horas sueltas" />
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
                  helperText={`Máximo ${Math.min(7, horasLibres)}h`}
                  value={horasSolicitadas}
                  onWheel={(e) => e.target.blur()}
                  onChange={e => {
                                const value = e.target.value;
                                const maxHoras = Math.min(7, horasLibres);
                                if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= maxHoras)) {
                                setHorasSolicitadas(value === '' ? '' : parseInt(value));
                                }
                            }}
                  slotProps={{ 
                    htmlInput:{
                        min: 1, max: Math.min(7, horasLibres) }
                    }}
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
                onFechasChange={setFechasSeleccionadas}
                esFechaSeleccionable={esFechaSeleccionable}
                horasLibres={horasLibres} 
              />
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <TextField
                label="Comentarios"
                rows={3}
                multiline
                fullWidth
                value={comentarios}
                onChange={e => setComentarios(e.target.value)}
                required={tipoSolicitud==="horas"}
                helperText={tipoSolicitud==="horas"?"Escribe qué horas necesitas":"Opcional"}
                placeholder={tipoSolicitud==="horas" 
                  ?"Ej: necesito salir 2 h antes…"
                  :"Vacaciones de Verano"
                }
              />
            </CardContent>
          </Card>
          {/* Resumen */}
          {fechasSeleccionadas.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 5, md: 2 }}>
                <Card sx={{p:2}}> 
                <Typography variant="body1" textAlign="center">
                    {tipoSolicitud === 'horas' ? 'Total horas Solicitadas' : 'Total Días Solicitados'}
                    </Typography>
                <Typography variant="h5" textAlign="center" fontWeight={600} sx={{mt:1}}>
                    {formatearTiempoVacasLargo(horasTotales)}</Typography>
                </Card>           
            </Grid>
            <Grid size={{ xs: 7, md: 4 }}>
                <Card sx={{p:2}}> 
                <Typography variant="body1" textAlign="center">Vacaciones tras aprobación</Typography>
                <Typography variant="h5" textAlign="center" sx={{mt:1}} fontWeight={600}>
                    {formatearTiempoVacasLargo(horasLibres-horasTotales)}      
                </Typography>
                </Card>           
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{p:2}}>
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
                                  borderColor: 'naranja.main',
                                  bgcolor: 'naranja.fondo', // Un fondo para que parezca un chip
                                  borderRadius: 3,
                                  cursor: 'pointer',
                                  '&:hover': {
                                  bgcolor: 'naranja.fondoFuerte',
                                  },
                              }}
                              >
                              <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                              <Typography fontSize='1.2rem' fontWeight={600}>
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
                </Card>
                </Grid>

            {horasTotales > horasLibres && (
                <Alert severity="error" sx={{ mt: 2 }}>
                No tienes suficientes horas disponibles
                </Alert>
            )}

        </Grid>
     )}

          {/* Enviar */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={saving || fechasSeleccionadas.length === 0 || horasTotales > horasLibres}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon/>}
            sx={{
              '& .MuiSvgIcon-root': {
                fontSize: '2.5rem'
              },
              fontSize: '1.5rem',
              py: 2,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #FB8C00 0%, #F57C00 100%)',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(251, 140, 0, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #F57C00 0%, #EF6C00 100%)',
                    boxShadow: '0 6px 20px rgba(251, 140, 0, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
            {saving ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </form>
      </Container>
    </>
  );
};

export default CrearSolicitudVacaciones;
