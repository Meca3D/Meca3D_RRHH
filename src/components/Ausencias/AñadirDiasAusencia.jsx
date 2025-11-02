// components/Ausencias/AñadirDiasAusencia.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, Alert, CircularProgress,
  Collapse, Grid, Chip
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  AddCircleOutline as AddIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useAusenciasStore } from '../../stores/ausenciasStore';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import { useUIStore } from '../../stores/uiStore';
import { ordenarFechas, esFechaPasadaOHoy, formatearFechaCorta, formatearFechaLarga } from '../../utils/dateUtils';
import CalendarioAusencias from './CalendarioAusencias';
import { capitalizeFirstLetter } from '../Helpers';

const AñadirDiasAusencia = () => {
  const navigate = useNavigate();
  const { ausenciaId } = useParams();
  const { user, isAdminOrOwner } = useAuthStore();
  const {
    añadirDiasAusencia,
    obtenerAusenciaCompleta,
    loadConfigAusencias
  } = useAusenciasStore();
  const { loadFestivos } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [ausenciaOriginal, setAusenciaOriginal] = useState(null);
  const [nuevasFechas, setNuevasFechas] = useState([]);
  const [motivoEdicion, setMotivoEdicion] = useState('');
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

        // Verificar permisos (trabajador = solo suyas, admin = todas)
        if (!isAdminOrOwner() && ausencia.solicitante !== user?.email) {
          showError('No tienes permisos para editar esta ausencia');
          navigate('/ausencias/solicitudes');
          return;
        }

        // Verificar que sea editable (pendiente o aprobada)
        if (ausencia.estado !== 'pendiente' && ausencia.estado !== 'aprobado') {
          showError('Solo se pueden añadir días a ausencias pendientes o aprobadas');
          navigate('/ausencias/solicitudes');
          return;
        }

        setAusenciaOriginal(ausencia);

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
    if (nuevasFechas.length === 0) {
      showError('Debes seleccionar al menos una fecha nueva para añadir');
      return;
    }

    setSaving(true);
    try {
      await añadirDiasAusencia(
        ausenciaId,
        nuevasFechas,
        motivoEdicion.trim(),
        ausenciaOriginal,
        false
      );

      showSuccess(`${nuevasFechas.length} día(s) añadido(s) correctamente`);
      navigate('/ausencias/solicitudes');
    } catch (err) {
      showError(`Error al añadir días: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getColorTipo = (tipo) => {
    return tipo === 'baja' ? 'error' : 'secondary';
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
                 >Extender Ausencia
                </Typography>
                      <Typography 
                          variant="caption" 
                          sx={{ 
                          opacity: 0.9,
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                          }}
                      >
                        Añade días adicionales a tu {ausenciaOriginal?.tipo === 'baja' ? 'baja' : 'permiso'}
                      </Typography>
                    </Box>
                    <AddIcon sx={{ fontSize: '2rem' }} />
                  </Toolbar>
                </AppBar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {/* Información de la ausencia original */}
          {ausenciaOriginal && (
            <Box  sx={{p:2, mb: 3, bgcolor:'azul.fondo', borderRadius:2, border:'1px solid #1976d2'}}>
              <Box sx={{display:'flex', justifyContent:'space-between', mb:1}}>
              <Typography variant="body1" fontWeight={600} mb={0.5}>
                {ausenciaOriginal.tipo === 'baja' ? '🔴 Baja' : '🟣 Permiso'}
              </Typography>
              <Typography variant="body1" fontWeight={600} mb={0.5}>
                {ausenciaOriginal.motivo}
              </Typography>
              </Box>
              <Box sx={{display:'flex', justifyContent:'space-between'}}>
              <Typography variant="body1" display="block">
                • Estado: 
              </Typography>
              <Typography variant="body1" display="block" fontWeight={600}>
                {capitalizeFirstLetter(ausenciaOriginal.estado)}
              </Typography>
              </Box>
              <Box sx={{display:'flex', justifyContent:'space-between'}}>
              <Typography variant="body1" display="block">
                • Días originales: 
              </Typography>
              <Typography variant="body1" display="block" fontWeight={600}>
                {ausenciaOriginal.fechas.length}
              </Typography>
              </Box>
              <Box sx={{display:'flex', justifyContent:'space-between'}}>
              <Typography variant="body1" display="block">
                • Días actuales:
              </Typography>
              <Typography variant="body1" display="block" fontWeight={600}>
                {ausenciaOriginal.fechasActuales.length}
              </Typography>
              </Box>
            </Box>
          )}

          {/* Card principal */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              {/* Selector de nuevas fechas */}
              <Typography variant="h6" fontWeight={600} mb={1} textAlign="center">
                Selecciona las fechas a añadir
              </Typography>
              
              <Box
                sx={{
                  border: '2px solid #4caf50',
                  borderRadius: 2,
                  p: 2,
                  bgcolor: '#f1f8f4',
                  mb: 3
                }}
              >
                <CalendarioAusencias
                  fechasSeleccionadas={nuevasFechas}
                  onFechasChange={setNuevasFechas}
                  esAdmin={isAdminOrOwner()}
                  fechasOriginales={ausenciaOriginal?.fechasActuales || []} // Bloquear fechas ya existentes
                />
              </Box>

              {/* Motivo de la edición */}
              <Typography variant="h6" fontWeight={600} mb={1} textAlign="center">
                Motivo de la extensión
              </Typography>
              <TextField
                fullWidth
                multiline
                required
                rows={3}
                value={motivoEdicion}
                onChange={(e) => setMotivoEdicion(e.target.value)}
                placeholder="Ej: Necesito más tiempo de recuperación, ..."
                sx={{ mb: 3 }}
              />
            </CardContent>
          </Card>

          {/* Resumen de cambios */}
          {nuevasFechas.length > 0 && (
            <Card elevation={3} sx={{ mb: 3, bgcolor: 'verde.fondo', borderLeft: '4px solid #4caf50' }}>
              <CardContent>
                <Typography variant="body1" fontWeight={700} mb={2} color="success.dark">
                  ➕ Resumen de días a añadir
                </Typography>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1" color="">Días actuales:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {ausenciaOriginal?.fechasActuales.length || 0}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body1" color="">Nuevos días:</Typography>
                  <Typography variant="body1" fontWeight={600} color="">
                    +{nuevasFechas.length}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2} pt={1} borderTop="1px solid #4caf50">
                  <Typography variant="body1" fontWeight={700}>Total:</Typography>
                  <Typography variant="body1" fontWeight={700} color="">
                    {(ausenciaOriginal?.fechasActuales.length || 0) + nuevasFechas.length} días
                  </Typography>
                </Box>

                {/* Lista de fechas nuevas */}
                {nuevasFechas.length === 1 ? (
                  <Box textAlign="center" py={1}>
                    <Typography variant="body1" fontWeight={600} color="success.main">
                      ➕ {formatearFechaLarga(nuevasFechas[0])}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    onClick={() => setMostrarListaFechas(!mostrarListaFechas)}
                    sx={{
                      p: 1.5,
                      border: '1px solid #4caf50',
                      bgcolor: '#fff',
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f9f9f9' }
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1" fontWeight={600} color="success.main">
                         Fechas Añadidas ({nuevasFechas.length})
                      </Typography>
                      {mostrarListaFechas ? <ExpandLess /> : <ExpandMore />}
                    </Box>
                    <Collapse in={mostrarListaFechas}>
                      <Grid container mt={1}>
                        {ordenarFechas(nuevasFechas).map(f => (
                          <Grid size={{ xs: 6 }} key={f}>
                          <Typography variant="body1" display="block" color="">
                            ➕ {formatearFechaCorta(f)}
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
                onClick={() => navigate('/ausencias/MisAusencias')}
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
                disabled={nuevasFechas.length === 0 || saving}
                startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
                sx={{
                  fontSize: '1.1rem',
                  py: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                    boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {saving ? 'Guardando...' : 'Añadir días'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default AñadirDiasAusencia;
