// src/components/UI/UserProfile.jsx

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, TextField, Button, Box, Typography,
  IconButton, InputAdornment, Snackbar, Alert, CircularProgress
} from '@mui/material';

import LogoutIcon from '@mui/icons-material/Logout';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LockIcon from '@mui/icons-material/Lock';
import { doc, updateDoc, query,getDocs,where,collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { updateProfile, getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import {useAuth} from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const IMGBB_API_KEY = import.meta.env.VITE_MY_IMGBB_API_KEY;
const UserProfile = ({ open, onClose, user, loading }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    currentPassword: '',
    newPassword: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const auth = getAuth();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        email: user.id || '',
        currentPassword: '',
        newPassword: ''
      });
      setPreviewUrl(user.photoURL || '');
    }
  }, [user,editMode]);

  // Si no hay usuario o está cargando, mostrar un estado de carga
    if (!user || loading) {
      return (
        <Dialog open={open} onClose={onClose}>
          <DialogContent>
            <CircularProgress />
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
  // Función para subir imagen a ImgBB
  const uploadImageToImgBB = async (file) => {
  try {
    // ✅ Verificar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato de archivo no soportado. Usa JPG, PNG o GIF.');
    }

    // ✅ Verificar tamaño (máximo 32MB para ImgBB)
    if (file.size > 32 * 1024 * 1024) {
      throw new Error('El archivo es demasiado grande. Máximo 32MB.');
    }

    const formData = new FormData();
    formData.append('image', file); // ✅ IMPORTANTE: usar "image" no "file"

    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
      formData,
      {
        headers: {
          // ✅ NO incluir Content-Type manualmente - axios lo hace automáticamente
        }
      }
    );

    if (response.data && response.data.success) {
      return response.data.data.url;
    } else {
      throw new Error('Error en la respuesta de ImgBB');
    }
  } catch (error) {
    console.error('Error al subir imagen a ImgBB:', error);
    
    // ✅ Manejo específico de errores de ImgBB
    if (error.response?.status === 400) {
      throw new Error('Formato de imagen no válido o archivo corrupto');
    }
    
    throw error;
  }
};
  const handleUpdateProfile = async () => {
    try {
           let photoURL = previewUrl; // Valor predeterminado: URL actual

      // Si hay un archivo seleccionado, súbelo a Imgur
      if (selectedFile) {
        photoURL = await uploadImageToImgBB(selectedFile);
      }

    // Actualizar Firestore
    const userRef = doc(db, 'USUARIOS', user.id);
    await updateDoc(userRef, {
      nombre: formData.nombre,
      photoURL: photoURL // Añadir la URL de la foto
    });

      // Actualizar Authentication
      await updateProfile(auth.currentUser, {
        displayName: formData.nombre,
        photoURL: photoURL // Añadir la URL de la foto
      });

      // Actualizar pedidos
      const pedidosQuery = query(collection(db, 'PEDIDOS'), where('usuarios', 'array-contains', user.id));
      const pedidosSnapshot = await getDocs(pedidosQuery);
      
      pedidosSnapshot.forEach(async (doc) => {
        const pedidoRef = doc.ref;
        const usuarios = doc.data().usuarios.map(u => 
          u.id === user.id ? { ...u, nombre: formData.nombre } : u
        );
        await updateDoc(pedidoRef, { usuarios });
      });

      setSnackbar({ open: true, message: 'Perfil actualizado!', severity: 'success' });
      setEditMode(false);
    } catch (error) {
      setSnackbar({ open: true, message: 'Error al actualizar: ' + error.message, severity: 'error' });
    }
  };

    const handleLogout = async () => {
      try {
        await logout();
        onClose()
        navigate('/login');
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
      }
    };

  const handlePasswordChange = async () => {
    try {
      const credential = EmailAuthProvider.credential(user.id, formData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, formData.newPassword);
      
      setSnackbar({ open: true, message: 'Contraseña actualizada!', severity: 'success' });
      setPasswordDialogOpen(false);
      setEditMode(false)
    } catch (error) {
      setSnackbar({ open: true, message: 'Error: ' + error.message, severity: 'error' });
    }
  };

    const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" flexDirection="column" alignItems="center" position="relative">
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="icon-button-file"
            type="file"
            onChange={handleFileChange}
          />
          {editMode &&
          <label htmlFor="icon-button-file">
            <IconButton component="span" sx={{ position: 'absolute', right: 0, top: 0 }}>
              <CameraAltIcon />
            </IconButton>
          </label>}
          {uploading ? (
            <Box sx={{ position: 'relative', width: 120, height: 120, mb: 2 }}>
              <CircularProgress size={120} />
              <Typography variant="caption" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                Subiendo...
              </Typography>
            </Box>
          ) : (
            <Avatar
              src={previewUrl}
              sx={{ width: 120, height: 120, mb: 2 }}
            />
            )}
          <Typography variant="h6">{formData.nombre}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <TextField
          fullWidth
          margin="normal"
          label="Nombre"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          slotProps={{
            input: {
              readOnly:!editMode,
            } 
          }}     
        />

        <TextField
          fullWidth
          margin="normal"
          label="Email"
          value={formData.email}
          slotProps={{
            input: {
              readOnly: true,
            },
          }}
        />

        {editMode && (
        <Box mt={2} textAlign="center">
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LockIcon />}
            onClick={() => setPasswordDialogOpen(true)}
          >
            Cambiar Contraseña
          </Button>
        </Box>
        )}
      </DialogContent>

<DialogActions sx={{display:'flex', justifyContent:'space-between', px: 3, pb: 2}}>
  {editMode ? (
    <>
      <Button 
        variant="outlined" 
        color="secondary" 
        size="small"
        startIcon={<CancelIcon />}
        sx={{ fontSize: '1rem', textTransform: 'none' }}
        onClick={() =>  {
          setEditMode(false); 
          setFormData({...formData, nombre: user.nombre});
        }}
      >
        Cancelar
      </Button>
      <Button 
        variant="contained" 
        size="small"
        startIcon={<SaveIcon />}
        sx={{ fontSize: '1rem', textTransform: 'none' }}
        onClick={handleUpdateProfile}
      >
        Guardar
      </Button>
    </>
  ) : (
    <>
      <Button 
        variant="outlined" 
        color="error" 
        size="small"
        startIcon={<LogoutIcon />}
        sx={{ fontSize: '1rem', textTransform: 'none' }}
        onClick={() => handleLogout()}
      >
        Cerrar Sesión
      </Button>
      <Button 
        variant="contained" 
        size="small"
        startIcon={<EditIcon />}
        sx={{ fontSize: '1rem', textTransform: 'none' }}
        onClick={() => setEditMode(true)}
      >
        Editar
      </Button>
    </>
  )}
</DialogActions>

      {/* Diálogo para cambiar contraseña */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
        <DialogTitle>Cambiar Contraseña</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            variant="outlined"
            type={showPassword ? 'text' : 'password'}
            margin="normal"
            label="Contraseña Actual"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            required
            slotProps={{
              input:{
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
            }
          }}
          sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            variant="outlined"
            type={showPassword ? 'text' : 'password'}
            margin="normal"
            label="Nueva Contraseña"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            required
            slotProps={{
              input:{
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
            }
          }}
          sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between', px: 3, pb: 2}}>
          <Button 
            variant="outlined" 
            color="secondary" 
            size="small"
            startIcon={<CancelIcon />}
            sx={{ fontSize: '1rem', textTransform: 'none' }}
            onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained" 
            size="small"
            startIcon={<SaveIcon />}
            sx={{ fontSize: '1rem', textTransform: 'none' }} 
            onClick={handlePasswordChange}>Cambiar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Dialog>
  );
};

export default UserProfile;
