// components/Admin/ModificarProducto.jsx
import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem,
  Paper, Snackbar, Alert, IconButton, Grid,
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';

const ModificarProducto = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: ''
  });
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
      const productRef = doc(db, 'PRODUCTOS', selectedProduct.id);
      await updateDoc(productRef, {
        nombre: formData.nombre,
        tipo: formData.tipo
      });
      
      // Actualizar estado local
      setProductos(prevProductos => 
        prevProductos.map(p => 
          p.id === selectedProduct.id ? { ...p, ...formData } : p
        )
      );
      
      setSnackbar({
        open: true,
        message: 'Producto actualizado con éxito',
        severity: 'success'
      });
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error al actualizar producto:', error);
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
          Modificar Productos
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
          color="primary"
          onClick={() => handleOpenDialog(producto)}
        >
          <EditIcon fontSize='small'/>
        </IconButton>
      </Box>
    </Box>
  ))}
</Paper>


      
      {/* Diálogo para editar producto */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle color='primary' align='center'>Editar Producto</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Nombre del Producto"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
          
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Tipo</InputLabel>
            <Select
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              label="Tipo"
            >
              <MenuItem value="comida">Comida</MenuItem>
              <MenuItem value="bebida">Bebida</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between'}}>
          <Button 
            onClick={handleCloseDialog}
            color='secondary'
            >
                Cancelar
            </Button>
          <Button 
            onClick={handleUpdateProduct} 
            variant="contained" 
            color="primary"
          >
            Guardar
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

export default ModificarProducto;
