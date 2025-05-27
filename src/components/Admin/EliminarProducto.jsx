// components/Admin/EliminarProducto.jsx
import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Button, 
  Paper, Snackbar, Alert, IconButton,
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';

const EliminarProducto = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

    // Cargar productos
    useEffect(() => {
    const fetchProductos = async () => {
        try {
        const productosRef = collection(db, 'PRODUCTOS');
        const snapshot = await getDocs(productosRef);
        
        const productosData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Ordenar alfabéticamente por nombre
        const productosOrdenados = productosData.sort((a, b) => 
            a.nombre.localeCompare(b.nombre)
        );
        
        setProductos(productosOrdenados);
        } catch (error) {
        console.error('Error al cargar productos:', error);
        setSnackbar({
            open: true,
            message: `Error: ${error.message}`,
            severity: 'error'
        });
        } finally {
        setLoading(false);
        }
    };
    
    fetchProductos();
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
      
      // Eliminar de Firestore
      const productRef = doc(db, 'PRODUCTOS', selectedProduct.id);
      await deleteDoc(productRef);
      
      // Actualizar estado local
      setProductos(prevProductos => 
        prevProductos.filter(p => p.id !== selectedProduct.id)
      );
      
      setSnackbar({
        open: true,
        message: 'Producto eliminado con éxito',
        severity: 'success'
      });
      
      handleCloseConfirmDialog();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && productos.length === 0) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 0, mb: 4 }}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <IconButton 
          aria-label="atras"        
          onClick={() => navigate('/admin')}
        >
          <ArrowBackIcon fontSize="large" />         
        </IconButton>
        <Typography textAlign="center" color="primary" variant="h4" component="h1" gutterBottom>
          Eliminar Productos
        </Typography>
      </Box>
      
<Paper sx={{ p: 2, mb: 4 }}>
  {/* Encabezados */}
  <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(224, 224, 224, 1)', pb: 1, mb: 1 }}>
    <Box sx={{ width: '85%', pl: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold">Nombre</Typography>
    </Box>
    <Box sx={{ width: '15%', textAlign: 'center' }}>
      <Typography variant="subtitle1" fontWeight="bold"></Typography>
    </Box>
  </Box>
  
  {/* Filas de datos */}
  {productos.map((producto) => (
    <Box 
      key={producto.id} 
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        py: 1.5,
        borderBottom: '1px solid rgba(224, 224, 224, 1)',
        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
      }}
    >
      <Box sx={{ width: '85%', pl: 2 }}>
        <Typography>{producto.nombre}</Typography>
      </Box>
      <Box sx={{ width: '15%', textAlign: 'center' }}>
        <IconButton 
          color="error"
          onClick={() => handleOpenConfirmDialog(producto)}
        >
          <ClearIcon />
        </IconButton>
      </Box>
    </Box>
  ))}
</Paper>

      
      {/* Diálogo de confirmación */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
      >
        <DialogTitle color='primary'fontWeight='bold' align='center'>
            {selectedProduct?.nombre}
        </DialogTitle>
        <DialogContent>
          <DialogContentText align='center'>
            ¿Estás seguro de que deseas eliminar el producto? 
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between'}}>
          <Button onClick={handleCloseConfirmDialog}>Cancelar</Button>
          <Button 
            onClick={handleDeleteProduct} 
            color="error" 
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EliminarProducto;
