import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, TextField, Button, Box, Typography,
  IconButton, InputAdornment, Snackbar, Alert, CircularProgress, Paper, Chip
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  getAuth, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  signOut, updateEmail, verifyBeforeUpdateEmail
} from 'firebase/auth';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const UserProfile = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { isAuthenticated, logout, setUserProfile, userProfile } = useAuthStore();
  const { showSuccess, showError } = useUIStore();

  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    vacaDias: '',
    vacaHoras: '',
    currentPassword: '',
    newPassword: '',
    newEmail: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const auth = getAuth();

  useEffect(() => {
    if (isAuthenticated && userProfile) {
      setFormData({
        nombre: userProfile.nombre || '',
        email: userProfile.email || '',
        vacaDias: userProfile.vacaDias || '',
        vacaHoras: userProfile.vacaHoras || '',
        currentPassword: '',
        newPassword: '',
        newEmail: userProfile.email || ''
      });
      setPreviewUrl(userProfile.photoURL || '');
    }
  }, [isAuthenticated, userProfile, editMode]);

  if (!isAuthenticated || !userProfile) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold" color="azul.main">
            Perfil de Usuario
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box textAlign="center" p={4}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Cargando perfil...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImageToImgBB = async (file) => {
    try {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Formato de archivo no soportado. Usa JPG, PNG o GIF.');
      }
      if (file.size > 32 * 1024 * 1024) {
        throw new Error('El archivo es demasiado grande. Máximo 32MB.');
      }
      const formData = new FormData();
      formData.append('image', file);
      setUploading(true);
      const response = await axios.post(
        `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
        formData,
      );
      if (response.data && response.data.success) {
        return response.data.data.url;
      } else {
        throw new Error('Error en la respuesta de ImgBB');
      }
    } catch (error) {
      console.error('Error al subir imagen a ImgBB:', error);
      if (error.response?.status === 400) {
        throw new Error('Formato de imagen no válido o archivo corrupto');
      }
      throw error;
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setUploading(true);
      let photoURL = previewUrl;
      if (selectedFile) {
        photoURL = await uploadImageToImgBB(selectedFile);
      }
      // Actualizar Firestore
      const userRef = doc(db, 'USUARIOS', userProfile.email);
      await updateDoc(userRef, {
        nombre: formData.nombre,
        vacaDias: formData.vacaDias,
        vacaHoras: formData.vacaHoras,
        photoURL: photoURL
      });
      // Actualizar Authentication
      await updateProfile(auth.currentUser, {
        displayName: formData.nombre,
        photoURL: photoURL
      });
      setUserProfile({
        ...userProfile,
        nombre: formData.nombre,
        vacaDias: formData.vacaDias,
        vacaHoras: formData.vacaHoras,
        photoURL: photoURL
      });
      showSuccess('Perfil actualizado correctamente!');
      setEditMode(false);
      setSelectedFile(null);
    } catch (error) {
      showError('Error al actualizar: ' + error.message);
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      onClose();
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      showError("Error al cerrar sesión");
    }
  };

  const handlePasswordChange = async () => {
    try {
      const credential = EmailAuthProvider.credential(userProfile.email, formData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, formData.newPassword);
      showSuccess('Contraseña actualizada correctamente!');
      setPasswordDialogOpen(false);
      setEditMode(false);
      setLoading(false);
      setFormData({ ...formData, currentPassword: '', newPassword: '' });
    } catch (error) {
      showError('Error: ' + error.message);
    }
  };

  const handleChangeEmail = async () => {
    try {
      setLoading(true);
      // 1. Reautenticar
      const credential = EmailAuthProvider.credential(userProfile.email, formData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      // 2. Actualizar email en Auth
      await verifyBeforeUpdateEmail(auth.currentUser, formData.newEmail);
      showSuccess('Se ha enviado un correo de verificación al nuevo email.');
      // 3. El usuario debe verificar el nuevo email antes de que el cambio sea efectivo
      setChangeEmailDialogOpen(false);
    } catch (error) {
      showError('Error: ' + error.message);
    } finally {
      setLoading(false);
      setFormData({ ...formData, currentPassword: '' });
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper:{
        sx: {
          borderRadius: 4,
          border: '1px solid rgba(0,0,0,0.08)'
        }
      },
      backdrop:{
            sx: {
      backdropFilter: 'blur(4px)',
      backgroundColor: 'rgba(0,0,0,0.2)'
    }
      }
      }}
    >
      <DialogContent>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 4,
            border: '1px solid rgba(0,0,0,0.08)',
            bgcolor: 'azul.fondo'
          }}
        >
          <Box display="flex" alignItems="center" flexDirection="column">
            {/* Avatar y foto */}
            <Box display="flex" justifyItems="center" alignItems="center" mb={2}>
              <Avatar
                src={previewUrl}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'azul.fondo',
                  color: 'azul.main'
                }}
              >
                {userProfile.nombre?.charAt(0) || 'U'}
              </Avatar>
              <Box flex={1}>
                {editMode && (
                  <Button
                    component="label"
                    variant="outlined"
                    size="small"
                    startIcon={<CameraAltIcon />}
                    sx={{
                      ml:2,
                      borderColor: 'azul.main',
                      color: 'azul.main',
                      '&:hover': {
                        bgcolor: 'azul.fondoFuerte'
                      }
                    }}
                  >
                    Cambiar foto
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </Button>
                )}
              </Box>
            </Box>

            {/* Nombre */}
            <TextField
              label="Nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              fullWidth
              InputProps={{
                readOnly: !editMode,
              }}
              sx={{ mb: 2 }}
            />

            {/* Email */}
            <TextField
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              sx={{ mb: 2 }}
            />
            {editMode && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setChangeEmailDialogOpen(true)}
                sx={{
                  mb: 2,
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  borderColor: 'azul.main',
                  color: 'azul.main',
                  '&:hover': {
                    bgcolor: 'azul.fondoFuerte'
                  }
                }}
              >
                Cambiar Email
              </Button>
            )}

            {/* Vacaciones */}
            <Box>
              <Typography variant="body2" color="azul.main" fontWeight={600}>
                Vacaciones
              </Typography>
              <Box display="flex" gap={2} mt={1}>
                <TextField
                  label="Días disponibles"
                  value={formData.vacaDias}
                  onChange={(e) => setFormData({ ...formData, vacaDias: e.target.value })}
                  InputProps={{
                    readOnly: !editMode,
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Horas disponibles"
                  value={formData.vacaHoras}
                  onChange={(e) => setFormData({ ...formData, vacaHoras: e.target.value })}
                  InputProps={{
                    readOnly: !editMode,
                  }}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>

            {/* Cambiar contraseña */}
            {editMode && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<LockIcon />}
                onClick={() => setPasswordDialogOpen(true)}
                sx={{
                  mt: 2,
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  borderColor: 'azul.main',
                  color: 'azul.main',
                  '&:hover': {
                    bgcolor: 'azul.fondoFuerte'
                  }
                }}
              >
                Cambiar Contraseña
              </Button>
            )}
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions
        sx={{
          p: 3,
          justifyContent: 'flex-end',
          gap: 2
        }}
      >
        {editMode ? (
          <>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CancelIcon />}
              disabled={loading || uploading}
              sx={{
                borderRadius: 3,
                px: 4,
                textTransform: 'none',
                fontWeight: 600
              }}
              onClick={() => {
                setEditMode(false);
                setSelectedFile(null);
                setPreviewUrl(userProfile.photoURL);
                setFormData({ ...formData, nombre: userProfile.nombre });
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              disabled={loading || uploading}
              sx={{
                borderRadius: 3,
                px: 4,
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
                }
              }}
              onClick={handleUpdateProfile}
            >
              {loading || uploading ? <CircularProgress size={24} color="inherit" /> : 'Guardar'}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="contained"
              color="error"
              startIcon={<LogoutIcon />}
              sx={{
                borderRadius: 3,
                px: 4,
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                }
              }}
              onClick={handleLogout}
            >
              Cerrar Sesión
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              sx={{
                borderRadius: 3,
                px: 4,
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
                }
              }}
              onClick={() => setEditMode(true)}
            >
              Editar
            </Button>
          </>
        )}
      </DialogActions>

      {/* Diálogo para cambiar contraseña */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: 'rgba(59, 130, 246, 0.02)',
            border: '1px solid rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold" color="azul.main">
            Cambiar Contraseña
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Contraseña actual"
            type={showPassword ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            fullWidth
            required
            InputProps={{
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
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Nueva contraseña"
            type={showPassword ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            fullWidth
            required
            InputProps={{
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
            }}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => setPasswordDialogOpen(false)}
            sx={{
              borderRadius: 3,
              px: 4,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handlePasswordChange}
            disabled={loading}
            sx={{
              borderRadius: 3,
              px: 4,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
              }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Cambiar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para cambiar email */}
      <Dialog
        open={changeEmailDialogOpen}
        onClose={() => setChangeEmailDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: 'rgba(59, 130, 246, 0.02)',
            border: '1px solid rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold" color="azul.main">
            Cambiar Email
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Nuevo email"
            value={formData.newEmail}
            onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Contraseña actual"
            type={showPassword ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            fullWidth
            required
            InputProps={{
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
            }}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary">
            Se enviará un correo de verificación al nuevo email. El cambio solo será efectivo tras la verificación.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => setChangeEmailDialogOpen(false)}
            sx={{
              borderRadius: 3,
              px: 4,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleChangeEmail}
            disabled={loading}
            sx={{
              borderRadius: 3,
              px: 4,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
              }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Enviar verificación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default UserProfile;
