// components/Nominas/ConfigurarDatosSalariales.jsx - VERSIÓN SIMPLIFICADA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, TextField, Button, Alert, Grid, FormControlLabel,
  Switch, FormControl, InputLabel, Select, MenuItem, Divider, CircularProgress
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  SettingsOutlined as SettingsIcon,
  Save as SaveIcon,
  AutoMode as AutoIcon,
  PictureInPictureAlt
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useNominaStore } from '../../stores/nominaStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDate } from '../../utils/nominaUtils';

const ConfigurarDatosSalariales = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { 
    configuracionNomina, 
    nivelesSalariales,
    loadingConfiguracion, 
    loadConfiguracionUsuario,
    loadNivelesSalariales, 
    updateConfiguracionNomina,
    calcularAñosServicio,
  } = useNominaStore();
  const { showSuccess, showError } = useUIStore();

  const [formData, setFormData] = useState({
    // Sueldo base único
    nivelSalarial: '',
    sueldoBase: 0,
    
    // Trienios con switch
    tieneTrienios: false, 
    valorTrienio: 0,
    
    // Otros complementos
    tieneOtrosComplementos: false,
    otroComplemento1: { concepto: '', importe: 0 },
    otroComplemento2: { concepto: '', importe: 0 },
    
    // Paga extra
    pagaExtra: 0
  });

  const [saving, setSaving] = useState(false);

  // ✅ Inicializar listeners reactivos
  useEffect(() => {
    if (user?.email) {
      const unsubscribeConfig = loadConfiguracionUsuario(user.email);
      const unsubscribeNiveles = loadNivelesSalariales();
      
      return () => {
        if (unsubscribeConfig) unsubscribeConfig();
        if (unsubscribeNiveles) unsubscribeNiveles();
      };
    }
  }, [user?.email]);

  // ✅ Cargar valores predeterminados cuando cambia el perfil
  useEffect(() => {
    if (userProfile && nivelesSalariales?.niveles) {
      const nivelUsuario = userProfile.nivel;
      
      // ✅ Sueldo base predeterminado del nivel
      let sueldoBasePredeterminado = 0;
      let valorTrienioPredeterminado = 0;
      
      if (nivelUsuario && nivelesSalariales.niveles[nivelUsuario]) {
        sueldoBasePredeterminado = nivelesSalariales.niveles[nivelUsuario].sueldoBase;
        valorTrienioPredeterminado = nivelesSalariales.niveles[nivelUsuario].valorTrienio;
      }


      setFormData(prev => ({
        ...prev,
        nivelSalarial: nivelUsuario || '',
        sueldoBase: prev.sueldoBase || sueldoBasePredeterminado,
        valorTrienio: prev.valorTrienio || valorTrienioPredeterminado 
      }));
    }
  }, [userProfile, nivelesSalariales, calcularAñosServicio]);

  // ✅ Cargar configuración guardada
  useEffect(() => {
    if (configuracionNomina) {
      setFormData(prev => ({
        ...prev,
        nivelSalarial: configuracionNomina.nivelSalarial || prev.nivelSalarial,
        sueldoBase: configuracionNomina.sueldoBase || prev.sueldoBase,
        tieneTrienios: configuracionNomina.tieneTrienios || false,
        valorTrienio: configuracionNomina.valorTrienio || prev.valorTrienio,
        tieneOtrosComplementos: configuracionNomina.tieneOtrosComplementos || false,
        otroComplemento1: configuracionNomina.otroComplemento1 || { concepto: '', importe: 0 },
        otroComplemento2: configuracionNomina.otroComplemento2 || { concepto: '', importe: 0 },
        pagaExtra: configuracionNomina.pagaExtra || 0
      }));
    }
  }, [configuracionNomina]);

  const handleSwitchChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.checked
    }));
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleComplementoChange = (complementoNum, field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [`otroComplemento${complementoNum}`]: {
        ...prev[`otroComplemento${complementoNum}`],
        [field]: e.target.value
      }
    }));
  };

  // ✅ Actualizar sueldo cuando cambia el nivel
  const handleNivelChange = (e) => {
    const nuevoNivel = e.target.value;
    const sueldoNuevo = nivelesSalariales?.niveles?.[nuevoNivel]?.sueldoBase || 0;
    const valorTrienioNuevo = nivelesSalariales?.niveles?.[nuevoNivel]?.valorTrienio || 0;
    
    setFormData(prev => ({
      ...prev,
      nivelSalarial: nuevoNivel,
      sueldoBase: sueldoNuevo, // Actualizar sueldo al cambiar nivel
      valorTrienio: valorTrienioNuevo // Actualizar valor trienio
    }));
  };

  const handleSave = async () => {
    // Validaciones
    if (!formData.sueldoBase || parseFloat(formData.sueldoBase) <= 0) {
      showError('El sueldo base es obligatorio y debe ser mayor a 0');
      return;
    }

    if (formData.tieneTrienios && (!formData.valorTrienio)) {
      showError('Si tienes trienios, debes especificar su valor');
      return;
    }

    if (formData.tieneOtrosComplementos) {
      const comp1 = formData.otroComplemento1;
      const comp2 = formData.otroComplemento2;
      
      if ((!comp1.concepto && comp1.importe) || (comp1.concepto && !comp1.importe)) {
        showError('El complemento 1 debe tener concepto e importe');
        return;
      }
      
      if ((!comp2.concepto && comp2.importe) || (comp2.concepto && !comp2.importe)) {
        showError('El complemento 2 debe tener concepto e importe');
        return;
      }
    }

    setSaving(true);
    try {
      const configuracionActualizada = {
        // ✅ Nivel y sueldo únicos
        nivelSalarial: formData.nivelSalarial,
        sueldoBase: parseFloat(formData.sueldoBase),
        
        // ✅ Trienios únicos
        tieneTrienios: formData.tieneTrienios,
        valorTrienio: formData.tieneTrienios ? parseFloat(formData.valorTrienio) || 0 : 0,
        
        // Otros complementos
        tieneOtrosComplementos: formData.tieneOtrosComplementos,
        otroComplemento1: formData.tieneOtrosComplementos ? {
          concepto: formData.otroComplemento1.concepto,
          importe: parseFloat(formData.otroComplemento1.importe) || 0
        } : { concepto: '', importe: 0 },
        otroComplemento2: formData.tieneOtrosComplementos ? {
          concepto: formData.otroComplemento2.concepto,
          importe: parseFloat(formData.otroComplemento2.importe) || 0
        } : { concepto: '', importe: 0 },
        
        // Paga extra
        pagaExtra: parseFloat(formData.pagaExtra) || 0
      };

      await updateConfiguracionNomina(user.email, configuracionActualizada);
      showSuccess('Configuración guardada correctamente');     
      setTimeout(() => {
        navigate('/nominas')
    }, 2000);
    } catch (error) {
      showError(`Error al guardar la configuración: ${error}`);
    } finally {
      setSaving(false);
    }
}

  const nivelOptions = nivelesSalariales?.niveles ? Object.keys(nivelesSalariales.niveles) : [];

  return (
    <>
      {/* AppBar */}
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #7B1FA2 0%, #6A1B9A 100%)',
          boxShadow: '0 2px 10px rgba(251, 140, 0, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/nominas')}
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
              Configurar Datos Salariales
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Año {new Date().getFullYear()}
            </Typography>
          </Box>

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
        <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 4 }}>
            {loadingConfiguracion ? (
              <Box textAlign="center" p={4}>
                <CircularProgress color="primary" />
                <Typography sx={{ mt: 2 }}>Cargando configuración...</Typography>
              </Box>
            ) : (
              <Grid container spacing={4}>
                {/* ✅ SECCIÓN: Sueldo Base */}
                <Grid size={{ xs: 12 }}>
                  <Typography sx={{mb:2}} variant="h6" color="purpura.main" fontWeight="600" gutterBottom>
                    Sueldo Base
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Nivel Salarial</InputLabel>
                        <Select
                          value={formData.nivelSalarial}
                          onChange={handleNivelChange}
                          label="Nivel Salarial"
                          sx={{
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'purpura.main'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'purpura.main'
                            }
                          }}
                        >
                          {nivelOptions.map(nivel => (
                            <MenuItem key={nivel} value={nivel}>
                              Nivel {nivel} - {nivelesSalariales.niveles[nivel].sueldoBase}€
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        type="number"
                        label="Sueldo base mensual (€)"
                        value={formData.sueldoBase}
                        onChange={handleChange('sueldoBase')}
                        required
                        onWheel={(e) => e.target.blur()}
                        fullWidth
                        slotProps={{ 
                          htmlInput:{
                            min: 0, step: 0.01 
                          }
                        }}
                        helperText="Se actualiza automáticamente al cambiar nivel, pero puedes cambiarlo"
                        sx={{

                          '& .MuiOutlinedInput-root': {
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'purpura.main'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'purpura.main'
                            }
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: 'purpura.main'
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{bgcolor:'purpura.main', mt:-1}} />
                </Grid>

                {/* ✅ SECCIÓN: Trienios  */}
                <Grid sx={{mt:-2}} size={{ xs: 12 }}>
                  <Typography variant="h6" color="purpura.main" fontWeight="600" >
                    Antigüedad
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.tieneTrienios}
                        onChange={handleSwitchChange('tieneTrienios')}
                         sx={{ 
                          '& .MuiSwitch-switchBase': {
                          color: 'grey.400',
                          '&.Mui-checked': {
                            color: 'purpura.main', 
                          },
                        },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'purpura.main' }
                        }}
                      />
                    }
                    label={
                      <Box sx={{ ml:1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {formData.tieneTrienios? "Cobro trienios" : "No cobro trienios"}
                        </Typography>
                      </Box>
                    }
                    sx={{ display: 'block' }}
                  />

                  {formData.tieneTrienios && (
                    <Grid sx={{mt:2}} container spacing={2}>
                      <Alert severity={userProfile?.fechaIngreso ? "info" : "error"} sx={{ mb: 2 }}>
                       {userProfile?.fechaIngreso ? 
                       <Typography textAlign="center" variant='body2'>
                        Segun tu fecha de ingreso: <strong>{formatDate(userProfile?.fechaIngreso)}</strong>, cobras ahora mismo <strong>{Math.floor(calcularAñosServicio(userProfile.fechaIngreso)/3)} Trienios</strong>
                        </Typography> 
                       : 
                       <Typography textAlign="center" variant='body2'>
                        Configura en tu perfil, la fecha de ingreso en la empresa para calcular automaticamente tus trienios.
                       </Typography>
                       }
                      </Alert>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          type="number"
                          label="Valor Trienio (€)"
                          value={formData.valorTrienio}
                          onChange={handleChange('valorTrienio')}
                          fullWidth
                          onWheel={(e) => e.target.blur()}
                          slotProps={{ 
                            htmlInput: {
                              min: 0, step: 0.01 
                             }
                            }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'purpura.main'
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'purpura.main'
                              }
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: 'purpura.main'
                            }
                          }}
                        />
                      </Grid>
                    </Grid>
                  )}
                <Divider sx={{bgcolor:'purpura.main', mt:3}}/>
                </Grid>

                {/* ✅ SECCIÓN: Otros Complementos */}
                <Grid sx={{mt:-2}} size={{ xs: 12 }}>
                  <Typography variant="h6" color="purpura.main" fontWeight="600" >
                    Otros Complementos
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.tieneOtrosComplementos}
                        onChange={handleSwitchChange('tieneOtrosComplementos')}
                        sx={{ 
                          '& .MuiSwitch-switchBase': {
                          color: 'grey.400',
                          '&.Mui-checked': {
                            color: 'purpura.main', 
                          },
                        },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'purpura.main' }
                        }}
                      />
                    }
                    label={
                      <Box sx={{ ml:1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {formData.tieneOtrosComplementos ? 'Tengo otros complementos' : 'No tengo otros complementos'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formData.tieneOtrosComplementos && 'Nocturnidad, dietas, plus transporte ...'}
                        </Typography>
                      </Box>
                    }
                    sx={{ mb:formData.tieneOtrosComplementos?'2':'0', display: 'block' }}
                  />

                  {formData.tieneOtrosComplementos && (
                    <Box sx={{ mt: 3 }}>
                      {/* Complemento 1 */}
                      <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                        Complemento 1
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            label="Concepto"
                            value={formData.otroComplemento1.concepto}
                            helperText="Ej: Plus de nocturnidad"
                            onChange={handleComplementoChange(1, 'concepto')}
                            fullWidth
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'purpura.main'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'purpura.main'
                                }
                              },
                              '& .MuiInputLabel-root.Mui-focused': {
                                color: 'purpura.main'
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            type="number"
                            label="Importe mensual (€)"
                            value={formData.otroComplemento1.importe}
                            onChange={handleComplementoChange(1, 'importe')}
                            fullWidth
                            onWheel={(e) => e.target.blur()}
                            slotProps={{
                              htmlInput:{
                                 min: 0, step: 0.01 
                                  }
                                }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'purpura.main'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'purpura.main'
                                }
                              },
                              '& .MuiInputLabel-root.Mui-focused': {
                                color: 'purpura.main'
                              }
                            }}
                          />
                        </Grid>
                      </Grid>

                      {/* Complemento 2 */}
                      <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                        Complemento 2
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            label="Concepto"
                            value={formData.otroComplemento2.concepto}
                            helperText="ej: Plus de distancia"
                            onChange={handleComplementoChange(2, 'concepto')}
                            fullWidth
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'purpura.main'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'purpura.main'
                                }
                              },
                              '& .MuiInputLabel-root.Mui-focused': {
                                color: 'purpura.main'
                              }
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            type="number"
                            label="Importe mensual (€)"
                            value={formData.otroComplemento2.importe}
                            onChange={handleComplementoChange(2, 'importe')}
                            fullWidth
                            onWheel={(e) => e.target.blur()}
                            slotProps={{
                              htmlInput:{
                               min: 0, step: 0.01
                                }
                              }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'purpura.main'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'purpura.main'
                                }
                              },
                              '& .MuiInputLabel-root.Mui-focused': {
                                color: 'purpura.main'
                              }
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider  sx={{bgcolor:'purpura.main'}}/>
                </Grid>

                {/* ✅ SECCIÓN: Paga Extra */}
                <Grid sx={{mt:-2}} size={{ xs: 12 }}>
                  <Typography sx={{mb:2}} variant="h6" color="purpura.main" fontWeight="600" gutterBottom>
                    Paga Extra
                  </Typography>
                  <TextField
                    type="number"
                    label="Importe paga extra (€)"
                    value={formData.pagaExtra}
                    helperText="Si conoces el importe de tus pagas extras, introducelo aquí"
                    onChange={handleChange('pagaExtra')}
                    fullWidth
                    onWheel={(e) => e.target.blur()}
                    slotProps={{ 
                      htmlInput:{
                        min: 0, step: 0.01 
                        }
                      }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'purpura.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'purpura.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'purpura.main'
                      }
                    }}
                  />
                </Grid>

                {/* Botón de guardar */}
                <Grid size={{ xs: 12 }}>
                  <Button 
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving || loadingConfiguracion}
                    fullWidth
                    sx={{
                      py: 2,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #8E24AA 0%, #6A1B9A 100%)', // Morados
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 4px 15px rgba(138, 43, 226, 0.3)', // Sombra morada
                      '&:hover': {
                        background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)', // Morados al pasar el ratón
                        boxShadow: '0 6px 20px rgba(106, 27, 154, 0.4)', // Sombra morada más intensa
                        transform: 'translateY(-2px)'
                      },
                      '&:disabled': {
                        background: 'linear-gradient(135deg, #E1BEE7 0%, #CE93D8 100%)', // Morados para deshabilitado
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                  </Button>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default ConfigurarDatosSalariales;
