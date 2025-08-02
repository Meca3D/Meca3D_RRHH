// components/Admin/ModificarProducto.jsx
import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem,
  Paper, AppBar, Toolbar, IconButton, Alert,
  CircularProgress, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import LunchDiningOutlinedIcon from '@mui/icons-material/LunchDiningOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../../stores/uiStore';
import { useProductsStore } from '../../../stores/productsStore';

const ModificarProducto = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const {showSuccess, showError} = useUIStore();
  const { products, updateProduct, getProductsByType, fetchProducts } = useProductsStore();
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: ''
  });


  useEffect(() => {
    if (!products.length) 
    fetchProducts()
  }, []);


  // Abrir diálogo para editar producto
  const handleOpenDialog = (producto) => {
    setSelectedProduct(producto);
    setFormData({
      nombre: producto.nombre || '',
      tipo: producto.tipo || ''
    });
    setDialogOpen(true);
  };

  // Cerrar diálogo
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProduct(null);
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Actualizar producto
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;
    
    try {
      setLoading(true);
      
      // Actualizar en Firestore
      await updateProduct(selectedProduct.id, {
        nombre: formData.nombre,
        tipo: formData.tipo
      });
      
      showSuccess('Producto actualizado con éxito');
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      showError('Error al actualizar producto ' + error.message)
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
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
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
                  Modificar Productos
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    opacity: 0.9,
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}
                >
                  de la carta de desayunos
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
                <EditOutlinedIcon sx={{fontSize:'2rem'}}/>
              </IconButton>
    
            </Toolbar>
          </AppBar>
          <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
            <Card sx={{p:3}}>
            <Alert severity="info" sx={{ }}>
              <Typography textAlign="center" variant="h6" fontWeight={'bold'}>
                Pulsa un producto para modificarlo
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
            <CardContent sx={{  }}>

        <Box display='flex' justifyContent="center" gap={2} sx={{ width: '100%', py: 1, bgcolor:'azul.fondo' }}>
          <LunchDiningOutlinedIcon sx={{fontSize:'2rem'}} />
          <Typography variant="h5" textAlign="center" fontWeight="bold">Comida</Typography>
        </Box>


        {getProductsByType("comida").map((producto) => (
              <Box 
                key={producto.id} 
                onClick={() => handleOpenDialog(producto)}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  borderTop: '1px solid rgba(0, 0, 0, 0.5)',
                  cursor: 'pointer', 
                  transition: 'background-color 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.06)' 
                  },
                  '&:active': {
                    bgcolor: 'rgba(0, 0, 0, 0.12)', 
                    transform: 'scale(0.99)', 
                    transition: 'background-color 0.1s ease-out, transform 0.1s ease-out'
                  }
                }}
              >
                <Typography sx={{px:1,py:2.5}} fontSize="1.2rem">{producto.nombre}</Typography>
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
            <CardContent sx={{  }}>

        <Box display='flex' justifyContent="center" gap={2} sx={{ width: '100%', py: 1, bgcolor:'azul.fondo' }}>
          <LocalCafeOutlinedIcon sx={{fontSize:'2rem'}} />
          <Typography variant="h5" textAlign="center" fontWeight="bold">Bebida</Typography>
        </Box>


        {getProductsByType("bebida").map((producto) => (
              <Box 
                key={producto.id} 
                onClick={() => handleOpenDialog(producto)}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  borderTop: '1px solid rgba(0, 0, 0, 0.5)',
                  cursor: 'pointer', // 
                  transition: 'background-color 0.2s ease-in-out', 
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.06)' 
                  },
                  '&:active': {
                    bgcolor: 'rgba(0, 0, 0, 0.12)',
                    transform: 'scale(0.99)', 
                    transition: 'background-color 0.1s ease-out, transform 0.1s ease-out' 
                  }
                }}
              >
                <Typography sx={{px:1,py:2.5}} fontSize="1.2rem">{producto.nombre}</Typography>
            </Box>
          ))}
          </CardContent>
        </Card>

      
      {/* Diálogo para editar producto */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} >
        <DialogTitle sx={{mt:2}} color='azul.main' variant="h5" align='center'>Editar Producto</DialogTitle>
        <DialogContent sx={{px:2}}>
          <TextField
            fullWidth
            margin="normal"
            label="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            slotProps={{
              inputLabel: {
            sx: {
              '&.MuiInputLabel-shrink': {
                fontSize: '1.2rem', // Tamaño cuando está en estado shrink
                },
                }
              }
            }}
                
            sx={{
              '& .MuiInputBase-input': {
              fontSize: '1.1rem',
              padding: '22px 12px',
            },

            }}
          />
          
          <FormControl fullWidth margin="normal" required>
            <InputLabel
              sx={{
                fontSize: '1.1rem', // Tamaño normal del label
                '&.MuiInputLabel-shrink': {
                  fontSize: '1.2rem', // Tamaño cuando está en estado shrink
                }
              }}
            >
              Tipo
            </InputLabel>
            <Select
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              label="Tipo"
              MenuProps={{
                sx:{
                  '& .MuiMenuItem-root': {
                fontSize: '1.3rem',
                padding: '22px 12px',
              }
                } // Tamaño del texto en el menú desplegable
              }}
              sx={{
              '& .MuiInputBase-input': {
                fontSize: '1.1rem', 
                padding: '22px 12px',
              },
              
              }}
            >
              <MenuItem value="comida" >Comida</MenuItem>
              <MenuItem value="bebida" >Bebida</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between'}}>
          <Button 
            onClick={handleCloseDialog}
            variant='outlined'
            color='secondary'
            sx={{
              fontSize: '1.1rem',
              padding: '10px 20px',}}
          
            >
                Cancelar
            </Button>
          <Button 

            onClick={handleUpdateProduct} 
            variant="contained" 
            color="primary"
            sx={{
              fontSize: '1.1rem',
              padding: '10px 20px',}}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

  </Container>
  </>
  );
};

export default ModificarProducto;
