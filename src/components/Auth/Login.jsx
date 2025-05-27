// src/components/Auth/Login.jsx
import React, { useState } from 'react';
import { replace, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Container,
  InputAdornment,
  IconButton,
  CssBaseline
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      
      // Mensajes de error más amigables
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('El email o la contraseña son incorrectos');
      } else if (err.code === 'auth/invalid-email') {
        setError('El formato del email no es válido');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Por favor, inténtalo más tarde');
      } else {
        setError(`Error al iniciar sesión: ${err.message}`);
      }
      
      setIsSubmitting(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <CssBaseline />
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: 4,
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 4,
              borderRadius: 2,
            }}
          >
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              mb={4}
            >
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <RestaurantIcon sx={{ fontSize: 30, color: 'white' }} />
              </Box>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                Pedidos Colectivos
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center">
                Inicia sesión para acceder a la aplicación
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                variant="outlined"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoFocus
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Contraseña"
                variant="outlined"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={toggleShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isSubmitting}
                sx={{
                  mt: 2,
                  py: 1.5,
                  borderRadius: 2,
                }}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </form>

            <Box mt={3} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                No hay registro público. Contacta con el administrador para obtener credenciales.
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default Login;