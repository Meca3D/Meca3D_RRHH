
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Grid,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Button
} from '@mui/material';
import {
  PersonRemoveOutlined,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  DeleteOutlined as DeleteOutlinedIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  WarningOutlined as WarningOutlinedIcon,
  Cancel as CancelIcon,
  GroupOutlined
} from '@mui/icons-material';
import { useEmpleadosStore } from '../../../stores/empleadosStore';
import { useUIStore } from '../../../stores/uiStore';
import { useAuthStore } from '../../../stores/authStore';
import { formatearTiempoVacas } from '../../../utils/vacacionesUtils';

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
  const {getRol}=useAuthStore()

  // Estado para el modal de confirmación
  const [modalOpen, setModalOpen] = useState(false);
  const [empleadoBorrando, setEmpleadoBorrando] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
        if (empleados.length === 0) {
    fetchEmpleados();
    }
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
            <PersonRemoveOutlined sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

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
          <>
              <Card sx={{p:3}}>
                <Alert severity="error" sx={{ }}>
                  <Typography textAlign="center" variant="h6" fontWeight={'bold'}>
                    Pulsa un empleado para borrarlo
                  </Typography> 
                </Alert>
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
              <Box display='flex' justifyContent="center" gap={2} sx={{ width: '100%', py: 1, bgcolor:'rojo.fondo' }}>
                <GroupOutlined sx={{fontSize:'2rem'}} />
                <Typography variant="h5" textAlign="center" fontWeight="bold">Empleados</Typography>
              </Box>
            
            {empleados.map((empleado) => (
              <Box 
                key={empleado.id} 
                onClick={() => handleBorrarEmpleado(empleado)}
                sx={{ 
                  px:1,
                  py:2,
                  display: 'flex', 
                  justifyContent:'space-between',
                  alignItems:'center',
                  borderTop: '1px solid rgba(0, 0, 0, 0.5)',
                  cursor: 'pointer', 
                  transition: 'background-color 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.06)' 
                  },
                  '&:active': {
                    bgcolor: 'rgba(0, 0, 0, 0.12)', 
                    transform: 'scale(0.98)', 
                    transition: 'background-color 0.1s ease-out, transform 0.1s ease-out',
                    borderLeft:'4px solid red'
                  },                 
                }}
              >
              <Box sx={{                   
                  display: 'flex', 
                  flexDirection:'column',
                  justifyContent:'center'
              }}
              >
                  <Typography sx={{fontWeight:'bold'}} fontSize="1.1rem">{empleado.nombre}</Typography>
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
        </>
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
