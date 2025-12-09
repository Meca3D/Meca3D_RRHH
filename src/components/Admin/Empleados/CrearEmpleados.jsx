// components/Admin/CrearEmpleado.jsx - CORREGIDO
import { useState, useEffect } from 'react';
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
  GroupOutlined
} from '@mui/icons-material';
import { useUIStore } from '../../../stores/uiStore';
import { formatearTiempoVacas, formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';
import { useEmpleadosStore } from '../../../stores/empleadosStore';
import { useAuthStore } from '../../../stores/authStore';

const CrearEmpleado = () => {
  const navigate = useNavigate();
  const {showSuccess,showError}=useUIStore()
  const {getRol}=useAuthStore()
  const {fetchEmpleados, empleados} = useEmpleadosStore()
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    photoURL: '',
    vacaDisponibles: '',
    rol: 'user',
    fechaIngreso: new Date().toISOString().split('T')[0],
    nivel: '',
    puesto: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
      if (empleados.length === 0) {
      fetchEmpleados();
      }
    }, [empleados.length]);

  const opcionesPuesto = [
    'Fresador',
    'Tornero', 
    'Operario CNC',
    'Administrativo',
    'Diseñador',
    'Montador',
    'Ayudante de Taller',
    'Jefe'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);


    try {
      const response = await fetch('/api/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess(result.message);
        setFormData({ 
          nombre: '', 
          email: '', 
          password: '', 
          photoURL: '',
          vacaDisponibles: '', 
          rol: 'user',
          fechaIngreso: new Date().toISOString().split('T')[0],
          nivel: '',
          puesto: ''
        });
        navigate('/admin/empleados');

      } else {
        showError(result.error);
      }
    } catch (error) {
      showError(`Error de conexión: ${error}`);
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

      if (loading && empleados.length === 0) {
        return (
          <Container sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Container>
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
              Registro y Lista de empleados
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
        <Card elevation={5} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography fontWeight="bold" textAlign='center' color='primary.main' sx={{mb:2, fontSize:'1.85rem'}}>
                Nuevo Trabajador
            </Typography>
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
                    onWheel={(e) => e.target.blur()}
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
                      color: 'primary.main', 
                      fontWeight: 600,
                      fontSize: '1.1rem'
                    }}
                  >
                    Vacaciones
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {/* Días de vacaciones */}
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Horas"
                        type="number"
                        value={formData.vacaDisponibles}
                        onChange={handleChange('vacaDisponibles')}
                        required
                        fullWidth
                        onWheel={(e) => e.target.blur()}
                        slotProps={{
                          input: {
                            endAdornment: <InputAdornment position="end">horas</InputAdornment>,
                          },
                          htmlInput:{ 
                            min: 0, step: 1 
                          }
                        }}
                        helperText=
                          {formData.vacaDisponibles 
                          ?  <Typography component="span" fontSize='1rem' sx={{fontWeight:700, color:'black' }}>{formatearTiempoVacasLargo(formData.vacaDisponibles)}</Typography>
                          : <Typography component="span" fontSize='0.9rem'>Especifica la cantidad de horas</Typography>
                          
                        }
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
                      <MenuItem value="leaveAdmin">Administrador de Ausencias</MenuItem>
                      <MenuItem value="cocinero">Cocinero</MenuItem>
                      <MenuItem value="owner">Jefe</MenuItem>
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
            </Box>
          </CardContent>
        </Card>
        <Card 
          elevation={5} 
          sx={{ 
            mt:2,
            borderRadius: 4,
            border: '1px solid rgba(0,0,0,0.08)'
          }}
        >
          <CardContent sx={{   }}>
              <Box display='flex' justifyContent="center" gap={2} sx={{ width: '100%', py: 1, bgcolor:'dorado.fondo' }}>
                <GroupOutlined sx={{fontSize:'2rem'}} />
                <Typography variant="h5" textAlign="center" fontWeight="bold">Empleados</Typography>
              </Box>
            
            {/* Filas de datos */}
            {empleados.map((empleado) => (
              <Box 
                key={empleado.id} 
                sx={{ 
                  px:1,
                  py:2,
                  display: 'flex', 
                  justifyContent:'space-between',
                  alignItems:'center',
                  borderTop: '1px solid rgba(0, 0, 0, 0.5)',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.06)' }
                }}
              >   
              <Box sx={{                   
                  display: 'flex', 
                  flexDirection:'column',
                  justifyContent:'center'
              }}
              >
                  <Typography sx={{fontWeight:'bold'}} fontSize="1.1rem">{empleado.nombre}</Typography>
                  <Typography sx={{}} fontSize="0.75rem">{empleado.id}</Typography>
                  <Typography sx={{}} fontSize="0.85rem">{empleado.puesto}</Typography>
                  <Typography sx={{}} fontSize="0.85rem">Fecha Ingreso:{empleado.fechaIngreso}</Typography>
                  <Typography sx={{}} fontSize="0.85rem">Nivel Salarial:{empleado.nivel}</Typography>
              </Box>
              <Box sx={{ 
                  display: 'flex', 
                  flexDirection:'column',
                  alignItems:'center',
                  justifyContent:'center'
              }}
              >
                <Typography sx={{}} fontSize="1rem">Vacaciones</Typography>
                <Typography sx={{}} fontSize="1.2rem">{formatearTiempoVacas(empleado.vacaciones.disponibles)}</Typography>
                <Typography sx={{mt:1}} fontSize="0.75rem">{getRol(empleado.rol)}</Typography>
              </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default CrearEmpleado;
