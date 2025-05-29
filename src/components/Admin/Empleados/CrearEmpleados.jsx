// components/Admin/CrearEmpleado.jsx
import React, { useState } from 'react';
import { 
  Box, TextField, Button, Typography, Alert, 
  FormControl, InputLabel, Select, MenuItem, Card, CardContent,
  Fab,  InputAdornment, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';

const CrearEmpleado = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono:'',
    photoURL:'',
    vacaDias:'',
    vacaHoras:'',
    rol: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(result.message);
        setFormData({ nombre: '', email: '', password: '', telefono:'', vacaDias:'',vacaHoras:'', rol: 'user' });
      setTimeout(() => {
        navigate('/admin/empleados/lista');
      }, 2000); // Redirigir después de 2 segundos
      
    } else {
      setError(result.error);
    }
  } catch (error) {
    console.log(error)
    setError('Error de conexión');
  } finally {
    setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

const handleChange = (field) => (e) => {
  setFormData(prev => ({
    ...prev,
    [field]: e.target.value
  }));
};

  return (
    <Box sx={{ p: 0, position: 'relative', maxWidth:'1000'}}>
      <Fab 
        sx={{ position: 'absolute', top: 1, left: 1, zIndex: 1 }}
        size="small"
        color="secondary"
        onClick={() => navigate('/admin/empleados')}
      >
        <ArrowBackIcon />
      </Fab>

      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Typography variant="h4" gutterBottom textAlign="center" color="primary">
          Crear Nuevo Empleado
        </Typography>

        <Card elevation={3}>
          <CardContent sx={{ p: 4 }}>
            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Nombre Completo"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                required
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="Contraseña temporal"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                required
                autoComplete='Contraseña'
                margin="normal"
                  slotProps={{
                    input:{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        size='small'
                        onClick={toggleShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  }
                }}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label="Teléfono"
                type="number"
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                sx={{ mb: 2 }}
                
              />
              <Typography variant="body1" textAlign="center" color="primary">
                 Vacaciones
              </Typography>
              <Box sx={{ mt:1, display:'flex', justifyContent:'space-between', mb: 3 }}>
                <TextField
                  fullWidth
                  label="Días"
                  type="number"
                  value={formData.vacaDias}
                  onChange={(e) => setFormData({...formData, vacaDias: e.target.value})}
                  required                
                />
                <TextField
                  fullWidth
                  label="Horas"
                  type="number"
                  value={formData.vacaHoras}
                  onChange={(e) => setFormData({...formData, vacaHoras: e.target.value})}
                  required
  
                />
              </Box>

              <FormControl fullWidth sx={{ mb: 4 }}>
                <InputLabel>Rol</InputLabel>
                <Select
                  label="Rol"
                  value={formData.rol}
                  onChange={(e) => setFormData({...formData, rol: e.target.value})}
                >
                  <MenuItem value="user">Empleado</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                  <MenuItem value="cook">Cocinero</MenuItem>
                </Select>
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                size="large"
                sx={{ py: 1.5, fontSize: '1.1rem' }}
              >
                {loading ? 'Creando Empleado...' : 'Crear Empleado'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default CrearEmpleado;
