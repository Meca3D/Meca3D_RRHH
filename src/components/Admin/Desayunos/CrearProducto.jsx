// En components/Admin/CrearProducto.jsx
import { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, TextField, Button, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem,
  Paper, IconButton, AppBar, Toolbar, CircularProgress,
} from '@mui/material';

import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import LunchDiningOutlinedIcon from '@mui/icons-material/LunchDiningOutlined';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useProductsStore } from '../../../stores/productsStore';
import { useUIStore } from '../../../stores/uiStore';

const CrearProducto = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useUIStore();
  const { products, createProduct, getProductsByType, fetchProducts } = useProductsStore();
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!products.length) 
    fetchProducts()
  }, []);
      
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.tipo) {
      showError('Por favor completa todos los campos')
      return;
    }
    
    try {
      setLoading(true);
      const nuevoProducto = {
        nombre: formData.nombre,
        tipo: formData.tipo
      }
      await createProduct( nuevoProducto);
      setFormData({
        nombre: '',
        tipo: ''
      });
      showSuccess('¡Producto creado con éxito!');  
      setTimeout(() => {
        navigate('/admin/desayunos');
      }, 1500);
      
    } catch (error) {
      showError('Error al crear producto:' + error.message);
    } finally {
      setLoading(false);
    }
  };

    if (loading && products.length === 0) {
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
                onClick={() => navigate('/admin/desayunos')}
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
                  Crear Nuevo Producto
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    opacity: 0.9,
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}
                >
                  Creación y lista de productos
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
                <AddIcon sx={{fontSize:'2rem'}}/>
              </IconButton>
    
            </Toolbar>
          </AppBar>
          <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
          <Card 
            elevation={5} 
            sx={{ 
              borderRadius: 4,
              border: '1px solid rgba(0,0,0,0.08)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h4" color="naranja.main" fontWeight="bold" textAlign='center'>
                Nuevo Producto
              </Typography>
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Nombre del Producto"
                name="nombre"
                color='naranja.main'
                value={formData.nombre}
                onChange={handleChange}
                margin="normal"
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
              />
          
              <FormControl fullWidth margin="normal" required>
                <InputLabel 
                  id="tipo-label"
                  sx={{
                    // Default color for the label
                    color: 'text.secondary', // Or whatever your default label color is

                    // Color when the label is focused
                    '&.Mui-focused': {
                      color: 'naranja.main',
                    },
                    // Color when the label has shrunk (i.e., has a value or is focused)
                    '&.Mui-shrink': {
                      color: 'naranja.main', // This will ensure it stays naranja.main when shrinked
                    },
                  }}
                >
                  Tipo
                </InputLabel>
                <Select
                  labelId="tipo-label"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  label="Tipo"
                  sx={{
                        // Styles for the outlined input border
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'grey', // Default border color, you can change it if needed
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main', // Hover border color
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'naranja.main', // Focused border color
                        },

                        // Styles for the InputLabel when focused
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: 'naranja.main', // Focused label color
                        },

                        // Styles for the value/text inside the select when focused
                        '& .MuiSelect-select.Mui-focused': {
                          // This targets the actual displayed value inside the select when focused
                          // You might want to change its color here if needed
                           color: 'naranja.main',
                        },

                        // Styles for the dropdown icon
                        '& .MuiSelect-icon': {
                          color: 'naranja.main', // Color of the dropdown arrow
                        },
                      }}
                    >
                  <MenuItem value="comida">Comida</MenuItem>
                  <MenuItem value="bebida">Bebida</MenuItem>
                </Select>
              </FormControl>
          
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  mt:3,
                  py: 2,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #FB8C00 0%, #F57C00 100%)',
                  fontSize: '1.5rem',
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
                {loading ? 'Creando...' : 'Crear Producto'}
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
                  <LunchDiningOutlinedIcon sx={{fontSize:'2rem'}} />
                  <Typography variant="h5" textAlign="center" fontWeight="bold">Comida</Typography>
                </Box>
              
              {/* Filas de datos */}
              {getProductsByType("comida").map((producto) => (
                <Box 
                  key={producto.id} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    borderTop: '1px solid rgba(0, 0, 0, 0.5)',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.2)' }
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Typography sx={{px:1,py:2}} fontSize="1.2rem">{producto.nombre}</Typography>
                  </Box>
                </Box>
              ))}
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
                  <LocalCafeOutlinedIcon sx={{fontSize:'2rem'}} />
                  <Typography variant="h5" textAlign="center" fontWeight="bold">Bebida</Typography>
                </Box>
              
              {/* Filas de datos */}
              {getProductsByType("bebida").map((producto) => (
                <Box 
                  key={producto.id} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    borderTop: '1px solid rgba(0, 0, 0, 0.5)',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.2)' }
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Typography sx={{px:1,py:2}} fontSize="1.2rem">{producto.nombre}</Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
      </Container>
    </>
  );
};

export default CrearProducto;
