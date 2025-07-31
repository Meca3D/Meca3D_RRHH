// components/Admin/Empleados/EditarEmpleados.jsx
import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, List, ListItem, ListItemText, InputAdornment,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem,
  Backdrop
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  Edit as EditIcon,
  EditOutlined as EditOutlinedIcon,
  Save as SaveIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useEmpleadosStore } from '../../../stores/empleadosStore';
import { useUIStore } from '../../../stores/uiStore';

const EditarEmpleados = () => {
  const navigate = useNavigate();
  const { 
    empleados, 
    loading, 
    error, 
    fetchEmpleados, 
    updateEmpleado,
    fetchEmpleadoPorEmail,
    changeEmployeePassword
  } = useEmpleadosStore();
  const { showSuccess, showError } = useUIStore();

  // Estado para el modal
  const [modalOpen, setModalOpen] = useState(false);
  const [empleadoEditando, setEmpleadoEditando] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState(''); 
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);

  // Opciones de puesto
  const opcionesPuesto = [
    'Fresador',
    'Tornero', 
    'Operario CNC',
    'Administrativo',
    'Diseñador',
    'Montador',
    'Ayudante de Taller'
  ];

  useEffect(() => {
    fetchEmpleados();
  }, []);

  const handleEditarEmpleado = async (empleado) => {
    try {
      // Cargar datos completos del empleado
      const empleadoCompleto = await fetchEmpleadoPorEmail(empleado.email);
      if (empleadoCompleto) {
        setEmpleadoEditando(empleadoCompleto);
        setFormData({
          nombre: empleadoCompleto.nombre || '',
          email: empleadoCompleto.email || '',
          fechaIngreso: empleadoCompleto.fechaIngreso || '',
          nivel: empleadoCompleto.nivel || '',
          puesto: empleadoCompleto.puesto || '',
          vacaDias: empleadoCompleto.vacaDias || '',
          vacaHoras: empleadoCompleto.vacaHoras || '',
          rol: empleadoCompleto.rol || 'user'
        });
        setModalOpen(true);
      }
    } catch (error) {
      showError(`Error al cargar datos del empleado: ${error}`);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEmpleadoEditando(null);
    setFormData({});
    setNewPassword('');
  };

  const handleSaveChanges = async () => {
    if (!empleadoEditando) return;

    setSaving(true);
    try {
      const datosActualizados = {
        nombre: formData.nombre,
        fechaIngreso: formData.fechaIngreso,
        nivel: parseInt(formData.nivel) || null,
        puesto: formData.puesto,
        vacaDias: parseInt(formData.vacaDias) || 0,
        vacaHoras: parseInt(formData.vacaHoras) || 0,
        rol: formData.rol
      };

      const success = await updateEmpleado(empleadoEditando.email, datosActualizados);
      
      if (success) {
        showSuccess('Empleado actualizado correctamente');
        setNewPassword('');
        setShowPassword(false);
        handleCloseModal();
      } else {
        showError('Error al actualizar empleado');
      }
    } catch (error) {
      showError(`Error al guardar cambios ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

      const handleChangePassword = async () => {
        if (!empleadoEditando || !newPassword) {
          showError('Por favor, ingresa una nueva contraseña.');
          return;
        }

        if (newPassword.length < 6) {
          showError('La contraseña debe tener al menos 6 caracteres.');
          return;
        }

        setChangingPassword(true);
        try {
          // ✅ USAR la función del store en lugar de fetch directo
          const result = await changeEmployeePassword(empleadoEditando.email, newPassword);

          if (result.success) {
            showSuccess('Contraseña actualizada correctamente');
            setNewPassword(''); // Limpiar campo
          } else {
            showError(result.message || 'Error al cambiar contraseña');
          }
        } catch (error) {
          showError(`Error al cambiar contraseña: ${error.message}`);
        } finally {
          setChangingPassword(false);
        }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };


  return (
    <>
      {/* AppBar azul */}
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #1E40AF 100%)',
          boxShadow: '0 2px 10px rgba(59, 130, 246, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
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

          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
              }}
            >
              Editar Datos de Empleados
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Selecciona empleado a modificar
            </Typography>
          </Box>

          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
            <EditOutlinedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

 {/* Contenido */}
     <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        {loading ? (
          <Box textAlign="center" p={3}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Cargando empleados...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : empleados.length === 0 ? (
          <Box textAlign="center" p={4}>
            <Typography color="text.secondary">
              No hay empleados registrados
            </Typography>
          </Box>
        ) : (
               <Grid container spacing={3} sx={{ p:3 }  }>
            {empleados.map((empleado) => (
              <Grid key={empleado.email} size={{ xs: 12, sm: 6, md: 4 }}>
                {/* ✅ CARD INDIVIDUAL DEL EMPLEADO */}
                <Card
                  elevation={5}
                  onClick={() => handleEditarEmpleado(empleado)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    
                    // ✅ EFECTOS HOVER/ACTIVO PARA MÓVIL
                    '&:hover': {
                      elevation: 8,
                      transform: 'translateY(-4px) scale(1.02)',
                      boxShadow: '0 12px 40px rgba(59, 130, 246, 0.15)',
                      borderColor: 'azul.main',
                      
                      // Efecto en el avatar
                      '& .avatar-empleado': {
                        transform: 'scale(1.1)',
                        boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)'
                      },
                      
                      // Efecto en el badge de editar
                      '& .edit-badge': {
                        transform: 'scale(1.1)',
                        bgcolor: 'azul.main',
                        color: 'white'
                      }
                    },
                    
                    '&:active': {
                      transform: 'translateY(-2px) scale(0.98)',
                      transition: 'transform 0.1s ease'
                    },

                                        // ✅ GRADIENTE AZUL EN EL BORDE SUPERIOR
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg,rgb(68, 119, 239),rgb(48, 38, 220),rgb(28, 85, 185))',
                      zIndex: 1
                    }
                    
                  }}
                >
                  <CardContent sx={{ p: 3, textAlign: 'center' }}>

                    {/* ✅ INFORMACIÓN DEL EMPLEADO */}
                    <Typography 
                      variant="h6" 
                      fontWeight="600"
                      sx={{ 
                        mb: 1,
                        fontSize: { xs: '1.5rem', sm: '1.75rem' },
                        color: 'text.primary',
                        lineHeight: 1.2
                      }}
                    >
                      {empleado.nombre}
                    </Typography>

                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color:"azul.main",
                        mb: 0,
                        fontSize: '1.1rem',
                        minHeight: '20px' // Para mantener altura consistente
                      }}
                    >
                      {empleado.puesto || 'Sin puesto asignado'}
                    </Typography>

                    {/* ✅ EFECTO RIPPLE PARA MÓVIL */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '0px',
                        height: '0px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                        transform: 'translate(-50%, -50%)',
                        transition: 'all 0.6s ease',
                        pointerEvents: 'none',
                        zIndex: 0,
                        
                        // Activar en touch
                        '.MuiCard-root:active &': {
                          width: '300px',
                          height: '300px'
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* ✅ MODAL DE EDICIÓN CON BACKDROP DIFUMINADO */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper:{
          sx: {
            borderRadius: 4,
           }
          },
        backdrop:{
          sx: {
            backdropFilter: 'blur(10px)', // ✅ Efecto de difuminado
            backgroundColor: 'rgba(0, 0, 0, 0.3)' // ✅ Fondo semitransparente
           }
          }
        }}
      >

          <Typography sx={{
            fontSize:'1.75rem',
            textAlign:'center',
            color:'azul.main',
            mt:2
          }}>{formData.nombre}</Typography>
        <DialogContent sx={{ mt:2, p: 2 }}>
          {empleadoEditando && (
            <Grid container spacing={3}>
              {/* Nombre */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Nombre completo"
                  value={formData.nombre || ''}
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

              {/* Fecha de Ingreso */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  type="date"
                  label="Fecha de Ingreso"
                  value={formData.fechaIngreso || new Date().toISOString().split('T')[0]}
                  onChange={handleChange('fechaIngreso')}
                  helperText={formData.fechaIngreso ? '': 'sin fecha de ingreso'}
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
                  value={formData.nivel || ''}
                  onChange={handleChange('nivel')}
                  slotProps={{ 
                    htmlInput:{
                      min: 1, max: 21 
                      }
                    }}
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

              {/* Puesto */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ '&.Mui-focused': { color: 'azul.main' } }}>
                    Puesto
                  </InputLabel>
                  <Select
                    value={formData.puesto || ''}
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

              {/* Rol */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ '&.Mui-focused': { color: 'azul.main' } }}>
                    Rol
                  </InputLabel>
                  <Select
                    value={formData.rol || 'user'}
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

              {/* Cambio de PassWord */}       
              <Grid size={{xs:12,md:6}}>
                <TextField
                  label="Nueva Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  onFocus={() => setPasswordFocus(true)}
                  onBlur={() => setPasswordFocus(false)}
                  helperText="Mínimo 6 caracteres. Deja vacío para no cambiar."
                  slotProps={{
                    input:{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={toggleShowPassword}
                            edge="end"
                            onFocus={() => setPasswordFocus(true)}
                            onBlur={() => setPasswordFocus(false)}
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
                
                {/* Botón para cambiar contraseña */}
                <Button
                  variant="outlined"
                  onClick={handleChangePassword}
                  startIcon={changingPassword ? <CircularProgress size={16} /> : <KeyIcon />}
                  disabled={changingPassword || !newPassword}
                  fullWidth
                  sx={{
                    mt: 2,
                    borderRadius: 2,
                    p: 1.5,
                    borderColor: 'azul.main',
                    color: 'azul.main',
                    '&:hover': {
                      borderColor: 'primary.dark',
                      color: 'white',
                      bgcolor: 'azul.main'
                    },
                    '&:disabled': {
                      borderColor: 'grey.300',
                      color: 'grey.400'
                    }
                  }}
                >
                  {changingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
                </Button>
              </Grid>

              {/* Sección Vacaciones */}
              <Grid size={{ xs: 12 }}>
                <Typography 
                  variant="h6" 
                  textAlign='center'
                  sx={{ 
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
                      value={formData.vacaDias || ''}
                      onChange={handleChange('vacaDias')}
                      fullWidth
                      inputProps={{ min: 0 }}
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
                      value={formData.vacaHoras || ''}
                      onChange={handleChange('vacaHoras')}
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
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ display:'flex', justifyContent:`space-between`, p: 1, gap:2 }}>
          <Button
            variant="outlined"
            onClick={handleCloseModal}
            startIcon={<CancelIcon />}
            disabled={saving}
            sx={{
              borderRadius:2,
              p:2,
              borderColor: 'rojo.main',
              color: 'rojo.main',
              '&:hover': {
                borderColor: 'rojo.main',
                color: 'rojo.main',
                bgcolor: 'rojo.fondo)'
              }
            }}
          >
            Cancelar
          </Button>
          
          <Button
            variant="contained"
            onClick={handleSaveChanges}
            startIcon={<SaveIcon />}
            disabled={changingPassword || passwordFocus|| saving}
            sx={{
              p:2,
              borderRadius:2,
              background: passwordFocus ? 'linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)' : 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditarEmpleados;
