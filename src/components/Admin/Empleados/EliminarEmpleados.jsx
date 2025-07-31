
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Grid,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Button
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  DeleteOutlined as DeleteOutlinedIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  WarningOutlined as WarningOutlinedIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useEmpleadosStore } from '../../../stores/empleadosStore';
import { useUIStore } from '../../../stores/uiStore';

const EliminarEmpleados = () => {
  const navigate = useNavigate();
  const { 
    empleados, 
    loading, 
    error, 
    fetchEmpleados, 
    deleteEmpleado
  } = useEmpleadosStore();
  const { showSuccess, showError } = useUIStore();

  // Estado para el modal de confirmación
  const [modalOpen, setModalOpen] = useState(false);
  const [empleadoBorrando, setEmpleadoBorrando] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEmpleados();
  }, []);

  const handleBorrarEmpleado = (empleado) => {
    setEmpleadoBorrando(empleado);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEmpleadoBorrando(null);
  };

  const handleConfirmDelete = async () => {
    if (!empleadoBorrando) return;

    setDeleting(true);
    try {
      const success = await deleteEmpleado(empleadoBorrando.email);
      
      if (success) {
        showSuccess(`Empleado ${empleadoBorrando.nombre} eliminado correctamente`);
        handleCloseModal();
      } else {
        showError('Error al eliminar empleado');
      }
    } catch (error) {
      showError(`Error al eliminar empleado: ${error}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* ✅ AppBar rojo */}
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
          boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)',
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
              Borrar Empleados
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Selecciona empleado para eliminar
            </Typography>
          </Box>

          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
            <DeleteOutlinedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

{/* ✅ CONTENIDO CON GRID DE CARDS ROJAS */}
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        {loading ? (
          <Box textAlign="center" p={4}>
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
          <Grid container spacing={3} sx={{ p:3 }} >
            {empleados.map((empleado) => (
              <Grid key={empleado.email} size={{ xs: 12, sm: 6, md: 4 }}>
                {/* ✅ CARD ROJA DEL EMPLEADO */}
                <Card
                  elevation={2}
                  onClick={() => handleBorrarEmpleado(empleado)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid rgba(239, 68, 68, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    
                    // ✅ EFECTOS HOVER/ACTIVO ROJOS
                    '&:hover': {
                      elevation: 8,
                      transform: 'translateY(-4px) scale(1.02)',
                      boxShadow: '0 12px 40px rgba(239, 68, 68, 0.15)',
                      borderColor: 'rojo.main',
                      
                      // Efecto en el avatar
                      '& .avatar-empleado': {
                        transform: 'scale(1.1)',
                        boxShadow: '0 8px 25px rgba(239, 68, 68, 0.3)'
                      },
                      
                      // Efecto en el badge de eliminar
                      '& .delete-badge': {
                        transform: 'scale(1.1)',
                        bgcolor: 'rojo.main',
                        color: 'white'
                      }
                    },
                    
                    '&:active': {
                      transform: 'translateY(-2px) scale(0.98)',
                      transition: 'transform 0.1s ease'
                    },
                    
                    // ✅ GRADIENTE ROJO EN EL BORDE SUPERIOR
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #EF4444, #DC2626, #B91C1C)',
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
                        fontSize: { xs: '1.5rem', sm: '1.5rem' },
                        color: 'text.primary',
                        lineHeight: 1.2
                      }}
                    >
                      {empleado.nombre}
                    </Typography>

                    <Typography 
                      variant="body2" 
                      color="rojo.main"
                      sx={{ 
                        mb: 0,
                        fontSize: '1.1rem',
                        minHeight: '20px'
                      }}
                    >
                      {empleado.puesto || 'Sin puesto asignado'}
                    </Typography>

                    {/* ✅ EFECTO RIPPLE ROJO PARA MÓVIL */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '0px',
                        height: '0px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)',
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

      {/* ✅ MODAL DE CONFIRMACIÓN CON DIFUMINADO ROJO */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
          sx: {
            borderRadius: 4,
            border: '2px solid',
            borderColor: 'rojo.main'
            }
          },
         backdrop:{
            sx: {
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)'
            }
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          color: 'white',
          textAlign: 'center'
        }}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} >
            <Typography variant="h5" fontSize="1.4rem" fontWeight="bold">
              Confirmar Eliminación
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          {empleadoBorrando && (
            <>
              <WarningOutlinedIcon sx={{ fontSize: 80, color: 'rojo.main', my: 2 }} />
              
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                ¿Estás seguro de eliminar este empleado?
              </Typography>
              
              {/* ✅ CARD DEL EMPLEADO A ELIMINAR */}
              <Card sx={{ 
                my: 3, 
                p: 2, 
                bgcolor: 'rgba(239, 68, 68, 0.05)', 
                borderRadius: 3,
                border: '1px solid rgba(239, 68, 68, 0.2)',
                textAlign: 'center'
              }}>
                
                <Typography variant="h6" fontSize="1.5rem" color="rojo.main" fontWeight="bold">
                  {empleadoBorrando.nombre}
                </Typography>
                <Typography variant="body2" fontSize="1.1rem" color="text.primary">
                  {empleadoBorrando.puesto || 'Sin puesto'}
                </Typography>
              </Card>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleCloseModal}
            startIcon={<CancelIcon />}
            disabled={deleting}
            fullWidth
            sx={{
              borderColor: 'azul.fondoFuerte',
              color: 'azul.main',
              py: 2,
              borderRadius: 3,
              '&:hover': {
                borderColor: 'azul.main',
                color: 'azul.main',
                bgcolor: 'rgba(0, 0, 0, 0.04)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            Cancelar
          </Button>
          
          <Button
            variant="contained"
            onClick={handleConfirmDelete}
            startIcon={<DeleteIcon />}
            disabled={deleting}
            fullWidth
            sx={{
              py: 2,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              fontSize: '1rem',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
              },
              '&:disabled': {
                background: 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            {deleting ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={20} color="inherit" />
                Eliminando...
              </Box>
            ) : (
              'Eliminar'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EliminarEmpleados;
