// components/Admin/EliminarProducto.jsx
import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Button, 
  Alert, IconButton,
  AppBar, Toolbar, Card, CardContent, 
  CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import LunchDiningOutlinedIcon from '@mui/icons-material/LunchDiningOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../../stores/uiStore';
import { useProductsStore } from '../../../stores/productsStore';

const EliminarProducto = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const {showSuccess, showError} = useUIStore();
  const { products, deleteProduct, getProductsByType, fetchProducts } = useProductsStore();


      useEffect(() => {
        if (!products.length) 
        fetchProducts()
      }, []);


  // Abrir diálogo de confirmación
  const handleOpenConfirmDialog = (producto) => {
    setSelectedProduct(producto);
    setConfirmDialogOpen(true);
  };

  // Cerrar diálogo de confirmación
  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setSelectedProduct(null);
  };

  // Eliminar producto
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    
    try {
      setLoading(true);
      await deleteProduct(selectedProduct.id);
      showSuccess('Producto eliminado con éxito')     
      handleCloseConfirmDialog();

    } catch (error) {
      console.error('Error al eliminar producto:', error);
      showError(`Error: ${error.message}`)

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
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
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
                  Eliminar Productos
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
                <DeleteOutlinedIcon sx={{fontSize:'2rem'}}/>
              </IconButton>
    
            </Toolbar>
          </AppBar>
          <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
            <Card sx={{p:3}}>
             <Alert severity="error" sx={{ }}>
              <Typography textAlign="center" variant="h6" fontWeight={'bold'}>
                Pulsa un producto para borrarlo
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

        <Box display='flex' justifyContent="center" gap={2} sx={{ width: '100%', py: 1, bgcolor:'rojo.fondo' }}>
          <LunchDiningOutlinedIcon sx={{fontSize:'2rem'}} />
          <Typography variant="h5" textAlign="center" fontWeight="bold">Comida</Typography>
        </Box>


        {getProductsByType("comida").map((producto) => (
              <Box 
                key={producto.id} 
                onClick={() => handleOpenConfirmDialog(producto)}
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

        <Box display='flex' justifyContent="center" gap={2} sx={{ width: '100%', py: 1, bgcolor:'rojo.fondo' }}>
          <LocalCafeOutlinedIcon sx={{fontSize:'2rem'}} />
          <Typography variant="h5" textAlign="center" fontWeight="bold">Bebida</Typography>
        </Box>


        {getProductsByType("bebida").map((producto) => (
              <Box 
                key={producto.id} 
                onClick={() => handleOpenConfirmDialog(producto)}
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
      
      {/* Diálogo de confirmación */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
      >
        <DialogTitle color='rojo.main'fontWeight='bold' align='center' variant='h5'>
            {selectedProduct?.nombre}
        </DialogTitle>
        <DialogContent>
          <DialogContentText align='center' variant='body1' color='black'>
            ¿Estás seguro de que deseas eliminar este producto? 
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between', px:3}}>
          <Button 
            onClick={handleCloseConfirmDialog}
            variant="outlined"
            disabled={loading}
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
            onClick={handleDeleteProduct} 
            color="error" 
            variant="contained"
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
            {loading ? (
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
    </Container>
    </>
  );
};

export default EliminarProducto;
