// components/Admin/CrearEmpleado.jsx - CORREGIDO
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, TextField, Button, Typography, Alert,
  FormControl, InputLabel, Select, MenuItem, Card, CardContent,
  InputAdornment, IconButton, AppBar, Toolbar, Grid
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  Visibility,
  VisibilityOff,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';

const CrearEmpleado = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    photoURL: '',
    vacaDias: '',
    vacaHoras: '',
    rol: 'user',
    fechaIngreso: new Date().toISOString().split('T')[0],
    nivel: '',
    puesto: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const opcionesPuesto = [
    'Fresador',
    'Tornero', 
    'Operario CNC',
    'Administrativo',
    'Diseñador',
    'Montador',
    'Ayudante de Taller'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message);
        setFormData({ 
          nombre: '', 
          email: '', 
          password: '', 
          photoURL: '',
          vacaDias: '',
          vacaHoras: '', 
          rol: 'user',
          fechaIngreso: new Date().toISOString().split('T')[0],
          nivel: '',
          puesto: ''
        });
        setTimeout(() => {
          navigate('/admin/empleados/lista');
        }, 2000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(`Error de conexión: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

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
          {/* Botón Volver */}
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/admin/empleados')}
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
              Crear Nuevo Empleado
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Registro de empleado
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
            <PersonAddIcon sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Contenido principal */}
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 4 }}>
            {message && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {message}
              </Alert>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Nombre */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Nombre completo"
                    value={formData.nombre}
                    onChange={handleChange('nombre')}
                    required
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'azul.main'
                      }
                    }}
                  />
                </Grid>

                {/* Email */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    required
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'azul.main'
                      }
                    }}
                  />
                </Grid>

                {/* Contraseña */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange('password')}
                    required
                    fullWidth
                    slotProps={{
                      input:{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={toggleShowPassword} edge="end">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'azul.main'
                      }
                    }}
                  />
                </Grid>

                {/* Fecha de Ingreso */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="date"
                    label="Fecha de Ingreso"
                    value={formData.fechaIngreso}
                    onChange={handleChange('fechaIngreso')}
                    required
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'azul.main'
                      }
                    }}
                  />
                </Grid>

                {/* Nivel */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    type="number"
                    label="Nivel Salarial (1-21)"
                    value={formData.nivel}
                    onChange={handleChange('nivel')}
                    slotProps={{ 
                      htmlInput:{
                        min: 1, max: 21
                      }
                     }}
                    fullWidth
                    helperText="Nivel salarial asignado"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'azul.main'
                      }
                    }}
                  />
                </Grid>

                {/* Puesto */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ '&.Mui-focused': { color: 'azul.main' } }}>
                      Puesto
                    </InputLabel>
                    <Select
                      value={formData.puesto}
                      onChange={handleChange('puesto')}
                      label="Puesto"
                      sx={{
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        }
                      }}
                    >
                      {opcionesPuesto.map((puesto) => (
                        <MenuItem key={puesto} value={puesto}>
                          {puesto}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Días de vacaciones */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      textAlign:'center',
                      mb: 1, 
                      color: 'azul.main', 
                      fontWeight: 600,
                      fontSize: '1.1rem'
                    }}
                  >
                    Vacaciones
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {/* Días de vacaciones */}
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label="Días"
                        type="number"
                        value={formData.vacaDias}
                        onChange={handleChange('vacaDias')}
                        required
                        fullWidth
                        slotProps={{ 
                          htmlInput:{
                            min: 0 
                         }
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'azul.main'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'azul.main'
                            }
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: 'azul.main'
                          }
                        }}
                      />
                    </Grid>

                    {/* Horas de vacaciones */}
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label="Horas"
                        type="number"
                        value={formData.vacaHoras}
                        onChange={handleChange('vacaHoras')}
                        required
                        fullWidth
                        slotrops={{
                          htmlInput:{
                             min: 0, max:7
                          }
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'azul.main'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'azul.main'
                            }
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: 'azul.main'
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                  </Grid>

                {/* Rol */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ '&.Mui-focused': { color: 'azul.main' } }}>
                      Rol
                    </InputLabel>
                    <Select
                      value={formData.rol}
                      onChange={handleChange('rol')}
                      label="Rol"
                      sx={{
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'azul.main'
                        }
                      }}
                    >
                      <MenuItem value="user">Empleado</MenuItem>
                      <MenuItem value="admin">Administrador</MenuItem>
                      <MenuItem value="cocinero">Cocinero</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Botón de crear */}
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                fullWidth
                sx={{
                  mt: 4,
                  py: 2,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? 'Creando Empleado...' : 'Crear Empleado'}
              </Button>
              {message && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {message}
              </Alert>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default CrearEmpleado;
