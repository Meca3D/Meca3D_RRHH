// components/Ausencias/CrearAusencia.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, FormControl, FormLabel,
  RadioGroup, Radio, FormControlLabel, Alert, CircularProgress,
  Collapse, MenuItem, Select, InputLabel,
  Grid
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  PostAddOutlined as PostAddOutlinedIcon,
  ExpandLess,
  ExpandMore,
  CalendarMonthOutlined as CalendarMonthOutlinedIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useAusenciasStore } from '../../stores/ausenciasStore';
import { useUIStore } from '../../stores/uiStore';
import { ordenarFechas, formatearFechaCorta } from '../../utils/dateUtils';
import CalendarioAusencias from './CalendarioAusencias';

const CrearAusencia = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    crearAusencia, 
    motivosPermisos, 
    motivosBajas,
    loadConfigAusencias 
  } = useAusenciasStore();
  const { showSuccess, showError } = useUIStore();

  const [tipo, setTipo] = useState(''); // 'permiso' o 'baja'
  const [motivo, setMotivo] = useState('');
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([]);
  const [comentariosSolicitante, setComentariosSolicitante] = useState('');
  const [saving, setSaving] = useState(false);
  const [mostrarListaFechas, setMostrarListaFechas] = useState(false);

  // Cargar festivos y config al montar
  useEffect(() => {
    const unsubConfig = loadConfigAusencias();
    return () => {
      if (unsubConfig) unsubConfig();
    };
  }, [loadConfigAusencias]);

  const handleTipoChange = (e) => {
    setTipo(e.target.value);
    setMotivo(''); // Reset motivo al cambiar tipo
    setFechasSeleccionadas([]);
    setComentariosSolicitante('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

    if (comentariosSolicitante.trim() === '') {
      showError('Debes explicar tu ausencia en los comentarios');
      return;
    }

    setSaving(true);
    try {
      await crearAusencia({
        solicitante: user.email,
        tipo,
        motivo,
        fechas: ordenarFechas(fechasSeleccionadas),
        comentariosSolicitante: comentariosSolicitante.trim(),
        comentariosAdmin: ''
      });

      showSuccess(tipo==='baja'?'Baja registrada correctamente':'Solicitud de Permiso enviada correctamente');
      navigate('/ausencias');
    } catch (err) {
      showError(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const motivosDisponibles = tipo === 'permiso' ? motivosPermisos : tipo === 'baja' ? motivosBajas : [];

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
            onClick={() => navigate('/ausencias')}
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
            Crear Ausencia
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              opacity: 0.9,
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            Pide un Permiso o Registra una Baja
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
          {tipo==='permiso' && (
          <Typography variant="h5" fontWeight={700} mb={2} textAlign="center">
            Solicitar {' '}
            <Box component="span" color="purpura.main">
              Permiso
            </Box>
            </Typography> )}
          {tipo==='baja' && (
          <Typography variant="h5" fontWeight={700} mb={2} textAlign="center">
            Registrar {' '}
            <Box component="span" color="rojo.main">
              Baja
            </Box>
          </Typography> )}

          {/* Card principal */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              {/* Paso 1: Tipo de ausencia */}
              <Typography variant="h6" textAlign='center' fontWeight={600} mb={1}>
                Tipo de ausencia
              </Typography>
              <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                <RadioGroup
                  value={tipo}
                  onChange={handleTipoChange}
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    justifyContent: 'space-between' 
                  }}
                >
                  <FormControlLabel 
                    value="permiso" 
                    control={<Radio sx={{ color: '#9C27B0', '&.Mui-checked': { color: '#9C27B0' } }} />} 
                    label="Permiso" 
                  />
                  <FormControlLabel 
                    value="baja" 
                    control={<Radio sx={{ color: '#d32f2f', '&.Mui-checked': { color: '#d32f2f' } }} />} 
                    label="Baja" 
                  />
                </RadioGroup>
              </FormControl>

              {/* Paso 2: Motivo */}
              {tipo && (
                <Collapse in={!!tipo}>
                  <Typography variant="h6" fontWeight={600} mb={1} textAlign='center'>
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

              {/* Paso 3: Fechas */}
              {tipo && motivo && (
                <Collapse in={!!tipo && !!motivo}>
                  <Typography variant="h6" fontWeight={600} textAlign='center' mb={1}>
                    Selecciona las fechas
                  </Typography>
                  <Box 
                    sx={{ 
                      border: '2px solid #e0e0e0', 
                      borderRadius: 2, 
                      p: 1, 
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

              {/* Paso 4: Comentarios */}
              {fechasSeleccionadas.length > 0 && (
                <Collapse in={fechasSeleccionadas.length > 0}>
                  <Typography variant="h6" fontWeight={600} mb={1} textAlign='center'>
                    Comentarios
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={comentariosSolicitante}
                    onChange={(e) => setComentariosSolicitante(e.target.value)}
                    placeholder="Especifica el motivo de tu ausencia..." 
                    required={true}
                    sx={{ mb: 3 }}
                  />
                </Collapse>
              )}
            </CardContent>
          </Card>

          {/* Resumen */}
          {fechasSeleccionadas.length > 0 && (
            <Card elevation={3} sx={{ mb: 3, borderLeft: tipo==="baja" ? '5px solid #d32f2f' :'5px solid #9C27B0' }}>
              <CardContent>
                <Typography variant="h6" textAlign='center' fontWeight={700} mb={2} sx={{color:tipo==="baja" ?'#d32f2f' :'#9C27B0'}}>
                  Resumen
                </Typography>

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

          {/* Botón enviar */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={
              !tipo || 
              !motivo || 
              fechasSeleccionadas.length === 0 || 
              saving ||
              comentariosSolicitante.trim() === ''
            }
            startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
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
            {saving ? 'Enviando...' : 'Enviar solicitud'}
          </Button>
        </Box>
      </Container>
    </>
  );
};

export default CrearAusencia;
