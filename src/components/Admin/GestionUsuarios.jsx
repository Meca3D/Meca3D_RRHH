// En components/Admin/GestionUsuarios.jsx
import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Box,
  Button, FormControl, InputLabel, Select, MenuItem,
  Snackbar, Alert, CircularProgress,Card
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const GestionUsuarios = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Cargar usuarios
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const usuariosRef = collection(db, 'USUARIOS');
        const snapshot = await getDocs(usuariosRef);
        
        const usuariosData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUsuarios(usuariosData);
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
        setSnackbar({
          open: true,
          message: `Error: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsuarios();
  }, []);

  // Abrir diálogo para editar rol
  const handleOpenDialog = (usuario) => {
    setSelectedUser(usuario);
    setNewRole(usuario.rol || 'user');
    setDialogOpen(true);
  };

  // Cerrar diálogo
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
  };

  // Actualizar rol de usuario
  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      // Actualizar en Firestore
      const userRef = doc(db, 'USUARIOS', selectedUser.id);
      await updateDoc(userRef, { rol: newRole });
      
      // Actualizar estado local
      setUsuarios(prevUsuarios => 
        prevUsuarios.map(u => 
          u.id === selectedUser.id ? { ...u, rol: newRole } : u
        )
      );
      
      setSnackbar({
        open: true,
        message: 'Rol actualizado con éxito',
        severity: 'success'
      });
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && usuarios.length === 0) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

return (
  <Container maxWidth="lg" sx={{ mt: 0, mb: 4 }}>
    <Typography textAlign="center" color="primary" variant="h4" component="h1" gutterBottom>
      Gestión de Usuarios
    </Typography>
    
    {isMobile ? (
      // Vista móvil con tarjetas
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {usuarios.map((usuario) => (
          <Card key={usuario.id} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h5">{usuario.nombre || 'Sin nombre'}</Typography>
              <IconButton 
                color="primary"
                onClick={() => handleOpenDialog(usuario)}
              >
                <EditIcon />
              </IconButton>
            </Box>
            <Typography variant="h7" color="text.secondary">{usuario.id}</Typography>
            <Box sx={{ mt: 2 }}>
              <Chip 
                variant="outlined"
                label={usuario.rol || 'user'} 
                color={usuario.rol === 'admin' ? 'primary' : 'default'}
                sx={{ 
                      fontSize: '0.9rem',
                      height: '26px',
                      borderRadius: 3,
                      backgroundColor: 'rgba(63, 81, 181, 0.04)',
                      '&:hover': {
                        backgroundColor: 'rgba(63, 81, 181, 0.08)'
                      }
                    }}
              />
            </Box>
          </Card>
        ))}
      </Box>
    ) : (
      // Vista de escritorio con tabla
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>{usuario.id}</TableCell>
                <TableCell>{usuario.nombre || 'Sin nombre'}</TableCell>
                <TableCell>
                  <Chip 
                    label={usuario.rol || 'user'} 
                    color={usuario.rol === 'admin' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    color="primary"
                    onClick={() => handleOpenDialog(usuario)}
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>)}
      
      {/* Diálogo para editar rol */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
        <DialogContent>
          <Typography color='primary' textAlign="center" variant="h5" gutterBottom>
            {selectedUser?.nombre || selectedUser?.id}
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Rol</InputLabel>
            <Select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              label="Rol"
            >
              <MenuItem value="user">Usuario</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between'}}>
          <Button 
            variant="outlined" 
            color="secondary" 
            size="small"
            startIcon={<CancelIcon />}
            sx={{fontSize: '1rem', borderRadius:2,textTransform: 'none'}}
            onClick={handleCloseDialog}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdateRole} 
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
)};


export default GestionUsuarios;
