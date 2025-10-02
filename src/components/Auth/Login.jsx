// src/components/Auth/Login.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth} from '../../firebase/config';
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
  CssBaseline,
  Input
} from '@mui/material';
import FactoryIcon from '@mui/icons-material/Factory';
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
  const { loading: authLoading, isAuthenticated } = useAuthStore(); 
  const { showSuccess, showError } = useUIStore();
  const navigate = useNavigate();


  useEffect(() => {

    // Si ya está autenticado y no está cargando el perfil, navegar a la ruta principal
    if (isAuthenticated && !authLoading) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

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
      // Autenticar con Firebase
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      showSuccess(`¡Bienvenido de nuevo!`);
      useAuthStore.getState().initAuthListener();

    } catch (err) {
      let errorMessage = 'Error al iniciar sesión';
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'El email o la contraseña son incorrectos';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'El formato del email no es válido';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Por favor, inténtalo más tarde';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <CssBaseline />
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
            <Box textAlign="center" mb={3}>
              <FactoryIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography component="h1" variant="h4" gutterBottom>
                Mecaformas 3D
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inicia sesión para acceder a la aplicación
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting||authLoading}
                slotProps={{
                  input:{
                    startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  )}
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting||authLoading}
                slotProps={{
                  input:{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
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

                  }

                }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isSubmitting||authLoading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} />
                ) : (
                  'Iniciar sesión'
                )}
              </Button>

              <Typography variant="body2" color="text.secondary" textAlign="center">
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
