import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Button, TextField, Typography, Container, Box,
  CircularProgress, Paper, Toolbar, AppBar, IconButton
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ClearIcon from '@mui/icons-material/Clear';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

import { useAuthStore } from '../../stores/authStore';
import { useOrdersStore } from '../../stores/ordersStore';
import { useUIStore } from '../../stores/uiStore';
import { PostAddOutlined } from '@mui/icons-material';

const CreateOrder = () => {
  const [orderName, setOrderName] = useState('');
  const [fechaReserva, setFechaReserva] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const { user } = useAuthStore();
  const { createOrder, loading } = useOrdersStore();
  const { showSuccess, showError } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!orderName.trim()) {
      showError('El nombre del pedido no puede estar vacío');
      return;
    }
    if (!fechaReserva || isNaN(fechaReserva.getTime())) {
      showError('Debes seleccionar una fecha válida');
      return;
    }
    
    try {
      const pedidoData = {
        nombre: orderName.trim(),
        creadoPor: user.email,
        usuarios: [],
        fechaReserva: fechaReserva
      };
      
      const pedidoId = await createOrder(pedidoData);
      showSuccess('¡Pedido creado correctamente!');
      setOrderName('');
      setFechaReserva(new Date(Date.now() + 24 * 60 * 60 * 1000));
      
      setTimeout(() => {
        navigate(`/desayunos/orders/${pedidoId}`, {
          state: {
            newOrder: {
              id: pedidoId,
              ...pedidoData
            }
          }
        });
      }, 1500);
    } catch (err) {
      showError(`Error al crear el pedido: ${err.message}`);
    }
  };

  return (
  <>
    <AppBar  
            sx={{ 
              overflow:'hidden',
              background: 'linear-gradient(135deg, #6D3B07 0%, #4A2505 50%, #2D1603 100%)',
              boxShadow: '0 2px 10px rgba(109, 59, 7, 0.2)',
              zIndex: 1100
            }}
          >
            <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
              {/* Botón Volver */}
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => navigate('/desayunos/orders')}
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
                  Crea un Nuevo Desayuno
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    opacity: 0.9,
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}
                >
                  Lugar y Hora de Reserva
                </Typography>
              </Box>

              <IconButton
          edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
              >
                <PostAddOutlined sx={{fontSize:'2rem'}}/>
              </IconButton>
            </Toolbar>
          </AppBar>
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>

        {/* Formulario con estilo corporativo */}
        <Paper 
          elevation={5} 
          sx={{ 
            p: 4, 
            borderRadius: 4,
            border: '1px solid rgba(0,0,0,0.08)'
          }}
        >
          <Box component="form" onSubmit={handleSubmit}>
            {/* Campo nombre del pedido */}
            <Box sx={{ mb: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LocalCafeOutlinedIcon sx={{ color: 'dorado.main', fontSize: '2.4rem' }} />
                <Typography  textAlign="center" variant="h6" fontSize="1.25rem" fontWeight="600" color="dorado.main">
                  Información del Pedido
                </Typography>
              </Box>
              
              <TextField
                label="Nombre del pedido"
                fullWidth
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                disabled={loading}
                required
                placeholder="Ej: Desayuno Hotel"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'dorado.main'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'dorado.main'
                    }
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'dorado.main'
                  }
                }}
              />
            </Box>

            {/* Campo fecha y hora */}
            <Box sx={{ mb: 4 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CalendarTodayIcon sx={{ color: 'dorado.main', fontSize: '2rem'}} />
                <Typography textAlign="center" variant="h6" fontSize="1.2rem" fontWeight="600" color="dorado.main">
                  Fecha y Hora de Reserva
                </Typography>
              </Box>
              
              <DateTimePicker
                label="Dia y Hora"
                value={fechaReserva}
                disabled={loading}
                onChange={(newValue) => setFechaReserva(newValue)}
                minDateTime={new Date()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'dorado.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'dorado.main'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'dorado.main'
                      }
                    }
                  }
                }}
              />
            </Box>

            {/* Botones de acción */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              {/* Botón cancelar */}
              <Button 
                variant="outlined" 
                color="secondary"   
                startIcon={<ClearIcon />}  
                component={RouterLink} 
                to="/desayunos/orders" 
                disabled={loading}
                fullWidth
                sx={{
                  py: 2,
                  borderRadius: 3,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  border: '2px solid',
                  borderColor: 'rojo.fondoFuerte',
                  color:'rojo.main',
                  '&:hover': {
                    borderColor: 'error.main',
                    color: 'error.main',
                    bgcolor: 'rgba(239, 68, 68, 0.04)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Cancelar'}
              </Button>

              <Button 
                type="submit" 
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                disabled={loading}
                fullWidth
                sx={{
                  py: 2,
                  borderRadius: 3,
                  background: 'linear-gradient(to bottom, #003399, #3366CC, #003399)', // Igual que OrderList
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(0, 51, 153, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(to right, #004080, #007BFF, #004080)', // Igual que OrderList
                    boxShadow: '0 6px 20px rgba(0, 51, 153, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Crear Pedido'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </LocalizationProvider>
  </>
  );
};

export default CreateOrder;
