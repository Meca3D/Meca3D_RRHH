import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, TextField, Button, Box, Typography,
  IconButton, InputAdornment, Alert, CircularProgress,
  MenuItem, Divider, Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CameraAlt as CameraAltIcon,
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import axios from 'axios';

const opcionesPuesto = [
  'Fresador',
  'Tornero', 
  'Operario CNC',
  'Administrativo',
  'Diseñador',
  'Montador',
  'Ayudante de Taller'
];

const UserProfile = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { userProfile, updateUserProfile, changePassword, logout } = useAuthStore();
  const { showSuccess, showError } = useUIStore();

  const [editMode, setEditMode] = useState(false);
  const [changePasswordMode, setChangePasswordMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    puesto: '',
    nivel: '',
    fechaIngreso: '',
    photoURL: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // ✅ Inicializar datos del formulario
  useEffect(() => {
    if (userProfile) {
      setFormData({
        nombre: userProfile.nombre || '',
        puesto: userProfile.puesto || '',
        nivel: userProfile.nivel || '',
        fechaIngreso: userProfile.fechaIngreso || '',
        photoURL: userProfile.photoURL || ''
      });
      setPreviewUrl(userProfile.photoURL || '');
    }
  }, [userProfile, editMode]);

  // ✅ Subir imagen a ImgBB
  const uploadImageToImgBB = async (file) => {
    try {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Formato no soportado. Usa JPG, PNG o GIF.');
      }

      if (file.size > 32 * 1024 * 1024) {
        throw new Error('El archivo es demasiado grande. Máximo 32MB.');
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(
        `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
        formData
      );

      if (response.data?.success) {
        return response.data.data.url;
      } else {
        throw new Error('Error en la respuesta de ImgBB');
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      throw error;
    }
  };

  // ✅ Manejar cambio de archivo
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // ✅ Actualizar perfil
  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      let photoURL = formData.photoURL;

      // Subir nueva foto si se seleccionó
      if (selectedFile) {
        setUploadingPhoto(true);
        photoURL = await uploadImageToImgBB(selectedFile);
      }

      // Actualizar perfil usando el store
      await updateUserProfile({
        ...formData,
        photoURL
      });

      showSuccess('Perfil actualizado correctamente');
      setEditMode(false);
      setSelectedFile(null);
      
    } catch (error) {
      showError(error.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
      setUploadingPhoto(false);
    }
  };

  // ✅ Cambiar contraseña
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      showSuccess('Contraseña actualizada correctamente');
      setChangePasswordMode(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (error) {
      if (error.message=="Firebase: Error (auth/invalid-credential)."){
        showError('La contraseña Actual no coincide')
      } else {
      showError(error.message || 'Error al cambiar la contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      onClose();
      navigate('/login');
    } catch (error) {
      showError('Error al cerrar sesión: '+error);
    }
  };

  // ✅ Cancelar edición
  const handleCancel = () => {
    setEditMode(false);
    setChangePasswordMode(false);
    setSelectedFile(null);
    setPreviewUrl(userProfile?.photoURL || '');
    setFormData({
      nombre: userProfile?.nombre || '',
      puesto: userProfile?.puesto || '',
      nivel: userProfile?.nivel || '',
      fechaIngreso: userProfile?.fechaIngreso || '',
      photoURL: userProfile?.photoURL || ''
    });
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  if (!userProfile) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      slotProps={{
        paper:{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh'
        }
      }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        pb:2,
        bgcolor:'azul.main'
      }}>
        <Typography variant="h5" component="div" color="white" fontWeight={600}>
          Mi Perfil
        </Typography>
        <Box onClick={onClose} display="flex" justifyContent="center" alignItems="center" sx={{width:35,height:35,borderRadius:'50%', border:'1px solid red', bgcolor:"white"}}>

          <CloseIcon color="error" sx={{fontSize:'190%'}}  />

        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2}>
          {/* ✅ Sección Avatar */}
              <Box sx={{ display:'flex', flexDirection:'column'}}>
              <Typography sx={{mt:2}} textAlign="center" variant="h6" fontWeight={600}>
                {userProfile.nombre}
              </Typography>
              <Typography sx={{mt:0.5}} textAlign="center" variant="body1" color="text.secondary">
                {userProfile.email}
              </Typography>
            </Box>
          <Box sx={{ display: 'flex', justifyContent:'center', alignItems: 'center'}}>
            
            <Box sx={{ position: 'relative', }}>
              <Avatar
                src={previewUrl}
                sx={{ 
                  width: 150, 
                  height: 150,
                  fontSize: '2rem',
                  fontWeight: 600,
                  bgcolor: 'primary.main',
                  border:'2px solid grey',
                  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                {userProfile.nombre?.charAt(0) || 'U'}
              </Avatar>
              
              {editMode && !changePasswordMode &&(
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="avatar-upload"
                  />
                  <label htmlFor="avatar-upload">
                    <IconButton
                      component="span"
                      sx={{
                        border:"1px solid black",
                        position: 'absolute',
                        bottom: -5,
                        right: -5,
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' }
                      }}
                    >
                      <CameraAltIcon />
                    </IconButton>
                  </label>
                </>
              )}
            </Box>
          </Box>

          <Divider />

          {/* ✅ Campos del perfil */}
          {!changePasswordMode ? (
            <Stack spacing={2.5}>

              <TextField
                label="Nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                fullWidth
                slotProps={{
                  input:{
                  readOnly: !editMode,
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color={editMode?"primary":"action"} />
                    </InputAdornment>
                  )}
                }}
              />

                {editMode ? (
                <Button
                  onClick={() => setChangePasswordMode(true)}
                  variant='outlined'
                  color="primary"
                  sx={{ 
                    p:1.6,
                    pl:1.7,
                    mt: 2,
                    textTransform: 'none',
                    fontSize:'1rem',
                    justifyContent: 'flex-start',

                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      display: 'flex', 
                      alignItems: 'center',
                      mr: 1, 
                    }}
                  >
                    <LockIcon color="primary" sx={{ fontSize: '1.5rem' }} />
                  </Box>
                  Cambiar Contraseña
                </Button>
                ):(
              <TextField
                value="Cambiar Contraseña"
                label=""
                fullWidth
                slotProps={{
                  input:{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" fontSize='medium' />
                    </InputAdornment>
                  )}
                }}
              />
                )}

              <TextField
                label="Puesto de trabajo"
                value={formData.puesto}
                onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                fullWidth
                select={editMode}
                slotProps={{
                  input:{
                  readOnly: !editMode,
                  startAdornment: (
                    <InputAdornment position="start">
                      <WorkIcon color={editMode?"primary":"action"} />
                    </InputAdornment>
                  )
                   }
                  }}
              >
                {opcionesPuesto.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Nivel profesional"
                value={formData.nivel}
                onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                fullWidth
                type="number"
                slotProps={{
                  input:{
                  readOnly: !editMode,
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon color={editMode?"primary":"action"} />
                    </InputAdornment>
                  )},
                  htmlInput: { 
                    min: 1, max: 15 }
                }}
              />

              <TextField
                label="Fecha de ingreso"
                value={formData.fechaIngreso}
                onChange={(e) => setFormData({ ...formData, fechaIngreso: e.target.value })}
                fullWidth
                type="date"
                slotProps={{
                  input:{
                  readOnly: !editMode,
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon color={editMode?"primary":"action"} />
                    </InputAdornment>
                  )
                  },
                  inputLabel:{
                    shrink: true
                  }
                }}
              />
              
              
            </Stack>
          ) : (

            
            /* ✅ Sección cambio de contraseña */
            <Stack spacing={2.5}>
              <Typography variant="h6" fontWeight={600}>
                Cambiar contraseña
              </Typography>

              <TextField
                label="Contraseña actual"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                fullWidth
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
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )}
                }}
              />

              <TextField
                label="Nueva contraseña"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                fullWidth
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
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )}
                }}
              />

              <TextField
                label="Confirmar nueva contraseña"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                fullWidth
                required
                error={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== ''}
                helperText={
                  passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== ''
                    ? 'Las contraseñas no coinciden'
                    : ''
                }
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
        <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
          {!editMode && !changePasswordMode ? (
            <>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{ width:'45%', textTransform: 'none', borderRadius:2, fontSize:'1.15rem', lineHeight:'1.25', }}
              >
                Cerrar sesión
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditMode(true)}
                sx={{ width:'50%', textTransform: 'none', borderRadius:2, fontSize:'1.15rem', lineHeight:'1.25' }}
              >
                Editar perfil
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                color='error'
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={loading}
                sx={{ width:'45%', textTransform: 'none', borderRadius:2, fontSize:'1.15rem', lineHeight:'1.25' }}
              >
                Cancelar
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={changePasswordMode ? handleChangePassword : handleUpdateProfile}
                disabled={loading || uploadingPhoto}
                sx={{ width:'50%', textTransform: 'none', borderRadius:2, fontSize:'1.15rem', lineHeight:'1.25'}}
              >
                {loading ? 'Guardando...' : changePasswordMode ? 'Cambiar contraseña' : 'Guardar cambios'}
              </Button>
            </>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default UserProfile;
