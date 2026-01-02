// components/HorasExtras/ConfiguracionHorasExtras.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Card, CardContent, AppBar, Toolbar,
  IconButton, TextField, Button, Alert, CircularProgress, Chip, Paper, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  CalendarToday as CalendarIcon,
  SettingsOutlined as SettingsIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Euro as EuroIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useHorasExtraStore } from '../../stores/horasExtraStore';
import { 
  tiposHorasExtra, 
  formatCurrency 
} from '../../utils/nominaUtils';
import {formatearNombre} from '../../components/Helpers';

const ConfiguracionHorasExtras = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { showSuccess, showError } = useUIStore();
   const { 
    getTarifasPorAño, 
    guardarConfiguracionAño,
    getAñosDisponibles,
    existeConfiguracionAño
  } = useHorasExtraStore();
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());
  const [añosDisponibles, setAñosDisponibles] = useState([new Date().getFullYear()]);
  const [modoCreacion, setModoCreacion] = useState(false);

  // Estados para el formulario
  const [tarifas, setTarifas] = useState({
    normal: 0,
    nocturna: 0,
    festiva: 0,
    festivaNocturna: 0
  });
  const [tarifasOriginales, setTarifasOriginales] = useState({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar años disponibles
  useEffect(() => {
    if (userProfile) {
      const años = getAñosDisponibles(userProfile);
      setAñosDisponibles(años);
    }
  }, [userProfile]);

  // Cargar tarifas cuando cambia el año
  useEffect(() => {
    if (!userProfile) return;

    const existe = existeConfiguracionAño(userProfile, añoSeleccionado);
    setModoCreacion(!existe);

    if (existe) {
      const tarifasAño = getTarifasPorAño(userProfile, añoSeleccionado);
      setTarifas({
        normal: tarifasAño.normal || 0,
        nocturna: tarifasAño.nocturna || 0,
        festiva: tarifasAño.festiva || 0,
        festivaNocturna: tarifasAño.festivaNocturna || 0
      });
      setTarifasOriginales({
        normal: tarifasAño.normal || 0,
        nocturna: tarifasAño.nocturna || 0,
        festiva: tarifasAño.festiva || 0,
        festivaNocturna: tarifasAño.festivaNocturna || 0
      });
    } else {
      const tarifasVacias = {
        normal: 0,
        nocturna: 0,
        festiva: 0,
        festivaNocturna: 0
      };
      setTarifas(tarifasVacias);
      setTarifasOriginales(tarifasVacias);
    }
  }, [añoSeleccionado, userProfile]);

  // Detectar cambios
  useEffect(() => {
    const hayDiferencias = Object.keys(tarifas).some(
      key => parseFloat(tarifas[key]) !== parseFloat(tarifasOriginales[key])
    );
    setHasChanges(hayDiferencias);
  }, [tarifas, tarifasOriginales]);

  const handleTarifaChange = (tipo, valor) => {
    const valorNumerico = parseFloat(valor) || 0;
    setTarifas(prev => ({
      ...prev,
      [tipo]: valorNumerico
    }));
  };

  const handleSave = async () => {
    const algunaTarifaCero = Object.values(tarifas).some(tarifa => tarifa <= 0);
    if (algunaTarifaCero) {
      showError('Todas las tarifas deben ser mayores a 0');
      return;
    }

    setSaving(true);
    try {
      // OBTENER configuración existente del año
      const configuracionExistente = getTarifasPorAño(userProfile, añoSeleccionado) || {};
      
      // Combinar datos existentes + nuevas tarifas
      const datosCompletos = {
        ...configuracionExistente, // Mantener datos de nómina (sueldoBase, etc.)
        ...tarifas,                // Sobrescribir solo las tarifas
        updatedAt: new Date()
      };
      //  Llamada al store
      await guardarConfiguracionAño(user.email, añoSeleccionado, datosCompletos);

      setTarifasOriginales(tarifas);
      setModoCreacion(false);
      
      const mensaje = modoCreacion 
        ? `Configuración de ${añoSeleccionado} creada correctamente`
        : `Configuración de ${añoSeleccionado} actualizada correctamente`;
      
      showSuccess(mensaje);
      
      setTimeout(() => {
        navigate('/horas-extras');
      }, 2000);

    } catch (error) {
      showError('Error al guardar configuración: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTarifas(tarifasOriginales);
  };

  const handleAñoChange = (event) => {
    setAñoSeleccionado(event.target.value);
  };

  const getTipoInfo = (tipo) => {
    return tiposHorasExtra.find(t => t.value === tipo) || { label: tipo, color: '#666' };
  };


  return (
    <>
      {/* ✅ AppBar con gradiente púrpura */}
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #7B1FA2 0%, #6A1B9A 50%, #4A148C 100%)',
          boxShadow: '0 2px 10px rgba(123, 31, 162, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          {/* Botón Volver */}
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/horas-extras')}
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

          {/* Título */}
          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
              }}
            >
              Configuración de Precios
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Gestionar tipos de Hora Extra
            </Typography>
          </Box>

          {/* Icono decorativo */}
          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
            <SettingsIcon sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Contenido principal */}
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Grid container spacing={3}>
        
        {/* ✅ CARD: Selector de año */}
        <Grid size={{ xs: 12 }}>
          <Card 
            elevation={3}
            sx={{
              borderRadius: 3,

              border: '1px solid rgba(123, 31, 162, 0.2)'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <CalendarIcon sx={{ color: 'purpura.main', fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'purpura.main' }}>
                  Seleccionar Año
                </Typography>
                
                {modoCreacion ? (
                  <Chip 
                    label="+ Nuevo año" 
                    size="small" 
                    color="success"
                  />
                )
                : (<Box></Box>)}
              </Box>

              <FormControl fullWidth>
                <InputLabel>Año de configuración</InputLabel>
                <Select
                  value={añoSeleccionado}
                  onChange={handleAñoChange}
                  label="Año de configuración"
                  sx={{
                    bgcolor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'purpura.main'
                    }
                  }}
                >
                  {añosDisponibles.map((año) => (
                    <MenuItem key={año} value={año}>
                      {año}
                      {año === new Date().getFullYear() && (
                        <Chip label="Actual" size="small" sx={{ ml: 2 }} color="primary" />
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {modoCreacion && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No existe configuración para {añoSeleccionado}. Se creará al guardar.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Formulario de tarifas */}
        <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3}>
              {tiposHorasExtra.map((tipo) => {
                const tipoInfo = getTipoInfo(tipo.value);
                return (
                  <Grid key={tipo.value} size={{ xs: 12, md: 6 }}>
                    <Card 
                      elevation={5} 
                      sx={{ 
                        p: 3, 
                        border: '2px solid',
                        borderColor: hasChanges && tarifas[tipo.value] !== tarifasOriginales[tipo.value] 
                          ? 'naranja.main' 
                          : 'rgba(0,0,0,0.08)',
                        borderRadius: 3,
                        bgcolor: hasChanges && tarifas[tipo.value] !== tarifasOriginales[tipo.value] 
                          ? 'rgba(251, 140, 0, 0.02)' 
                          : 'transparent'
                      }}
                    >
                      {/* Header del tipo */}
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Box 
                          sx={{ 
                            width: 15, 
                            height: 15, 
                            minWidth: 15, 
                            minHeight: 15, 
                            maxWidth: 15, 
                            maxHeight: 15, 
                            bgcolor: tipoInfo.color, 
                            borderRadius: '50%' 
                          }} 
                        />

                        <Typography variant="h6" fontWeight="bold" sx={{ml:-1}}>
                          {tipoInfo.label}
                        </Typography>
                        {hasChanges && tarifas[tipo.value] !== tarifasOriginales[tipo.value] && (
                          <Chip 
                            label="Modificado" 
                            size="small" 
                            sx={{ marginLeft:'auto', fontSize:'0.8rem', bgcolor: 'naranja.main', color: 'white' }}
                          />
                        )}
                        
                      </Box>

                      {/* Input de tarifa */}
                      <TextField
                        type="number"
                        label="Precio por hora (€)"
                        value={tarifas[tipo.value] || ''}
                        onChange={(e) => handleTarifaChange(tipo.value, e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        slotProps={{ 
                            htmlInput:{
                          min: 0, 
                          step: 0.01,
                          style: { textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }
                            }
                        }}
                        fullWidth
                        helperText={`Precio original: ${formatCurrency(tarifasOriginales[tipo.value] || 0)}`}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: tipo.color
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: tipo.color
                            }
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: 'black'
                          }
                        }}
                      />
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Vista previa de cambios */}
            {hasChanges && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  Cambios pendientes:
                </Typography>
                {Object.keys(tarifas).map(tipo => {
                  if (tarifas[tipo] !== tarifasOriginales[tipo]) {
                    const tipoInfo = getTipoInfo(tipo);
                    return (
                      <Typography key={tipo} variant="body2">
                        • <strong>{formatearNombre(tipoInfo.label)}:</strong> {formatCurrency(tarifasOriginales[tipo])} → {formatCurrency(tarifas[tipo])}
                      </Typography>
                    );
                  }
                  return null;
                })}
              </Alert>
            )}

            {/* Botones de acción */}
            <Box sx={{ display: 'flex', gap: 2, mt: 4, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                disabled={!hasChanges || saving}
                sx={{
                  py: 2,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'text.secondary',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'purpura.main',
                    color: 'purpura.main',
                    bgcolor: 'rgba(123, 31, 162, 0.04)'
                  }
                }}
              >
                Deshacer Cambios
              </Button>

              <Button 
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!hasChanges || saving}
                fullWidth
                sx={{
                  py: 2,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #7B1FA2 0%, #6A1B9A 100%)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(123, 31, 162, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #6A1B9A 0%, #4A148C 100%)',
                    boxShadow: '0 6px 20px rgba(123, 31, 162, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {saving 
                      ? 'Guardando...' 
                      : modoCreacion 
                        ? `Crear Configuración ${añoSeleccionado}` 
                        : 'Actualizar Configuración'
                    }
              </Button>
            </Box>
          </CardContent>
        </Card>
        </Grid>
      </Container>
    </>
  );
};

export default ConfiguracionHorasExtras;
