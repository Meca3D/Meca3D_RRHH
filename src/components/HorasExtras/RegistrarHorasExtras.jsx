// components/HorasExtras/RegistrarHorasExtras.jsx - CORREGIDO
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Card, CardContent, TextField, Button,
  MenuItem, Alert, AppBar, Toolbar, IconButton
} from '@mui/material';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import {
  Save as SaveIcon,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useHorasExtraStore } from '../../stores/horasExtraStore';
import { useUIStore } from '../../stores/uiStore';
import { tiposHorasExtra } from '../../utils/nominaUtils';

const RegistrarHorasExtras = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { addHorasExtra, calcularImporteHorasExtra, loading } = useHorasExtraStore();
  const { showSuccess, showError } = useUIStore();

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'normal',
    horas: 0,
    minutos: 0,
    tarifa: userProfile?.tarifasHorasExtra?.normal || 15
  });

  const [saving, setSaving] = useState(false);

  const importeCalculado = calcularImporteHorasExtra(
    formData.horas, 
    formData.minutos, 
    formData.tarifa
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fecha) {
      showError('La fecha es obligatoria');
      return;
    }
    
    if (formData.horas === 0 && formData.minutos === 0) {
      showError('Debes introducir al menos 1 minuto');
      return;
    }

    if (formData.minutos >= 60) {
      showError('Los minutos deben ser menores a 60');
      return;
    }

    setSaving(true);
    try {
      const horasExtraData = {
        empleadoEmail: user.email,
        fecha: formData.fecha,
        tipo: formData.tipo,
        horas: parseInt(formData.horas) || 0,
        minutos: parseInt(formData.minutos) || 0,
        tarifa: parseFloat(formData.tarifa),
        importe: importeCalculado
      };

      await addHorasExtra(horasExtraData);
      showSuccess('Horas extra registradas correctamente');
      
      setTimeout(() => {
        navigate('/horas-extras');
      }, 1500);
      
    } catch (error) {
      showError('Error al registrar horas extra: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTipoChange = (tipo) => {
    const tarifas = userProfile?.tarifasHorasExtra || {};
    const tarifa = tarifas[tipo] || 15;
    
    setFormData({
      ...formData,
      tipo,
      tarifa
    });
  };

  const formatearTiempoPreview = (horas, minutos) => {
    const h = parseInt(horas) || 0;
    const m = parseInt(minutos) || 0;
    
    if (h === 0 && m === 0) return '0 min';
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  return (
    <>
      {/* ✅ AppBar como OrderList con gradiente naranja */}
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #FB8C00 0%, #F57C00 50%, #EF6C00 100%)',
          boxShadow: '0 2px 10px rgba(251, 140, 0, 0.2)',
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
              Registrar Horas Extra
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Nuevo registro de tiempo
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
            <AddCircleOutlineOutlinedIcon />
          </IconButton>

        </Toolbar>
      </AppBar>

      {/* Contenido principal */}
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        <Card 
          elevation={0} 
          sx={{ 
            borderRadius: 4,
            border: '1px solid rgba(0,0,0,0.08)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Fecha */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="date"
                    label="Fecha"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    fullWidth
                    required
                    focused
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'naranja.main'
                      }
                    }}
                  />
                </Grid>

                {/* Tipo de hora extra */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    label="Tipo de Hora Extra"
                    value={formData.tipo}
                    onChange={(e) => handleTipoChange(e.target.value)}
                    fullWidth
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'naranja.main'
                      }
                    }}
                  >
                    {tiposHorasExtra.map((tipo) => (
                      <MenuItem key={tipo.value} value={tipo.value}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              bgcolor: tipo.color, 
                              borderRadius: '50%' 
                            }} 
                          />
                          {tipo.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Horas */}
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    type="number"
                    label="Horas"
                    value={formData.horas}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      horas: Math.max(0, parseInt(e.target.value) || 0)
                    })}
                    inputProps={{ min: 0, max: 12 }}
                    fullWidth
                    helperText="Máximo 12h"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'naranja.main'
                      }
                    }}
                  />
                </Grid>

                {/* Minutos */}
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    type="number"
                    label="Minutos"
                    value={formData.minutos}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      minutos: Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                    })}
                    inputProps={{ min: 0, max: 59, step: 5 }}
                    fullWidth
                    helperText="0-59 min"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'naranja.main'
                      }
                    }}
                  />
                </Grid>

                {/* Tarifa */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="number"
                    label="Tarifa por hora (€)"
                    value={formData.tarifa}
                    onChange={(e) => setFormData({ ...formData, tarifa: e.target.value })}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                    helperText="Tarifa según tipo seleccionado"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'naranja.main'
                      }
                    }}
                  />
                </Grid>
              </Grid>

              {/* Vista previa del cálculo */}
              <Card
                sx={{ 
                    p:2,
                    mt: 3, 
                    mb: 3,
                    bgcolor: 'rgba(251, 140, 0, 0.05)',
                    border: '1px solid rgba(251, 140, 0, 0.2)'
                    }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                  <Box>
                    <Typography variant="body1" fontWeight="600">
                      <TimeIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: '1.2rem' }} />
                      Tiempo: {formatearTiempoPreview(formData.horas, formData.minutos)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tarifa: {formData.tarifa}€/hora
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h5" color="naranja.main" fontWeight="bold">
                      {importeCalculado.toFixed(2)}€
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Importe total
                    </Typography>
                  </Box>
                </Box>
              </Card>

              {/* Botón de registro */}
              <Button 
                type="submit" 
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving || loading}
                fullWidth
                sx={{
                  py: 2,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #FB8C00 0%, #F57C00 100%)',
                  fontSize: '1.2rem',
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
                {saving ? 'Registrando...' : 'Registrar Horas Extra'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default RegistrarHorasExtras;
