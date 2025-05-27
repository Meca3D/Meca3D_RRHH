// En components/Admin/CrearProducto.jsx
import React, { useState } from 'react';
import { 
  Container, Typography, Box, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem,
  Paper, Snackbar, Alert,IconButton
} from '@mui/material';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const CrearProducto = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: ''
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

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
      setSnackbar({
        open: true,
        message: 'Por favor completa todos los campos',
        severity: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Añadir el producto a Firestore
      await addDoc(collection(db, 'PRODUCTOS'), {
        nombre: formData.nombre,
        tipo: formData.tipo
      });
      
      // Resetear el formulario
      setFormData({
        nombre: '',
        tipo: ''
      });
      
      setSnackbar({
        open: true,
        message: '¡Producto creado con éxito!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al crear producto:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 0, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <IconButton 
            aria-label="atras"       
            onClick={() => navigate('/admin')}
        >
            <ArrowBackIcon fontSize="large" />         
        </IconButton>
        <Typography textAlign="center" color="primary" variant="h4" component="h1" gutterBottom>
            Nuevo Producto
        </Typography>
        </Box>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Nombre del Producto"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            margin="normal"
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
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Producto'}
          </Button>
        </Box>
      </Paper>
      
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

export default CrearProducto;
