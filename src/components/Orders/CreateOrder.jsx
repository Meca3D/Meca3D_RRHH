import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Button, TextField, Typography, Container, Box, 
  CircularProgress, Paper, Snackbar, Alert
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ClearIcon from '@mui/icons-material/Clear';
import { crearPedido } from '../../firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

const CreateOrder = () => {
  const [orderName, setOrderName] = useState('');
  const [horaLlegada, setHoraLlegada] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Validar que el usuario esté autenticado
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!orderName.trim()) {
      setError('El nombre del pedido no puede estar vacío');
      return;
    }

    try {
      setLoading(true);
      setError('');     
      // Crear el pedido con estructura correcta
 const pedidoId=await crearPedido(orderName.trim(),currentUser.email,[], horaLlegada)
 setSuccess(true);
 setOrderName('');
 setHoraLlegada('')
 // Redirigir al detalle del pedido recién creado
  setTimeout(() => {
   navigate(`/orders/${pedidoId}`);
 }, 1500);
 
} catch (err) {
 console.error('Error al crear pedido:', err);
 setError(`Error al crear el pedido: ${err.message}`);
} finally {
 setLoading(false);
}
};

  const handleCloseSnackbar = () => {
    setSuccess(false);
    setError('');
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" color='primary' gutterBottom align="center">
          Crear Nuevo Pedido
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Nombre del pedido"
            variant="outlined"
            value={orderName}
            onChange={(e) => setOrderName(e.target.value)}
            disabled={loading}
            margin="normal"
            required
          />
           <TextField
            fullWidth
            label="Hora de Llegada"
            type="time"
            slotProps={{
              InputLabelProps:{
                shrink: true},
              inputProps:{
                  step: 300} // 5 minutos de intervalo
            
            }}
            variant="outlined"
            value={horaLlegada}
            onChange={(e) => setHoraLlegada(e.target.value)}
            disabled={loading}
            margin="normal"
            required
          />

          <Button 
            variant="contained" 
            color='secondary'   
            startIcon={<ClearIcon />}  
            component={RouterLink} 
            to="/orders" 
            disabled={loading}
            fullWidth
            sx={{  mt: 5, mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : <Typography>CANCELAR</Typography>}
          </Button>
          <Button 
            type="submit" 
            startIcon={<AddCircleOutlineIcon />}
            variant="contained"    
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} /> : <Typography>CREAR PEDIDO</Typography> }
          </Button>
        </Box>
      </Paper>
      
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar open={success} autoHideDuration={1500} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          ¡Pedido creado correctamente!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateOrder;