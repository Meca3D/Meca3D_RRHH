import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Button, TextField, Typography, Container, Box, 
  CircularProgress, Paper, Snackbar, Alert, InputAdornment
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ClearIcon from '@mui/icons-material/Clear';
import { crearPedido } from '../../firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

const CreateOrder = () => {
  const [orderName, setOrderName] = useState('');
  const [fechaReserva, setFechaReserva] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // ✅ Date object por defecto
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
 const pedidoId=await crearPedido(orderName.trim(),currentUser.email,[], fechaReserva)
 setSuccess(true);
 setOrderName('');
 setFechaReserva('')
 // Redirigir al detalle del pedido recién creado
  setTimeout(() => {
   navigate(`/desayunos/orders/${pedidoId}`);
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
 <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom textAlign="center" color="primary">
            Crear Nuevo Pedido
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Nombre del pedido"
              fullWidth
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              disabled={loading}
              margin="normal"
              required
            />

            {/* ✅ Reemplazar input datetime-local por DateTimePicker */}
            <DateTimePicker
              label="Fecha y hora de reserva"
              value={fechaReserva}
              onChange={(newValue) => setFechaReserva(newValue)}
              minDateTime={new Date()} // No permitir fechas pasadas
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  margin: 'normal'
                }
              }}
            />

          <Button 
            variant="contained" 
            color='secondary'   
            startIcon={<ClearIcon />}  
            component={RouterLink} 
            to="/desayunos/orders" 
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
    </LocalizationProvider>
  );
};

export default CreateOrder;