// components/Admin/Vacaciones/GestionFestivos.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, List, ListItem, ListItemText,
  Fab, FormControl, InputLabel, Select, MenuItem, Chip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Grid, CircularProgress, Menu, ListItemIcon
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  EventAvailable as EventAvailableIcon,
  Add as AddIcon,
  EditOutlined as EditOutlinedIcon,
  DeleteOutline as DeleteOutlineIcon,
  ContentCopyOutlined as ContentCopyOutlinedIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { capitalizeFirstLetter } from '../../Helpers';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useUIStore } from '../../../stores/uiStore';
import { formatYMD } from '../../../utils/dateUtils';

const GestionFestivos = () => {
  const navigate = useNavigate();
  const { 
    festivos,
    loading,
    loadFestivos,
    crearFestivo,
    editarFestivo,
    eliminarFestivo,
    copiarFestivosAño,
    obtenerAñosConFestivos
  } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());
  const [añosDisponibles, setAñosDisponibles] = useState([]);

  // Estados para menú contextual
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [festivoSeleccionado, setFestivoSeleccionado] = useState(null);
  // Estados para dialogs
  const [dialogAñadir, setDialogAñadir] = useState(false);
  const [dialogEditar, setDialogEditar] = useState(false);
  const [dialogCopiar, setDialogCopiar] = useState(false);
  const [dialogEliminar, setDialogEliminar] = useState(false);
  
  // Estados para formularios
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [nombreFestivo, setNombreFestivo] = useState('');
  const [añoOrigen, setAñoOrigen] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      const unsubscribe = loadFestivos();
      const años = await obtenerAñosConFestivos();
      setAñosDisponibles(años);
      return unsubscribe;
    };
    
    let cleanup;
    cargarDatos().then(unsubscribe => {
      cleanup = unsubscribe;
    });
    
    return () => cleanup && cleanup();
  }, [añoSeleccionado, loadFestivos, obtenerAñosConFestivos]);

  const festivosAño = useMemo(() => festivos.filter(f => f.fecha.startsWith(añoSeleccionado)), [festivos, añoSeleccionado])

  // Generar opciones de años (actual ± 5 años)
  const añosParaSelector = () => {
    const añoActual = new Date().getFullYear();
    const años = [];
    for (let i = añoActual - 2; i <= añoActual + 5; i++) {
      años.push(i);
    }
    return años;
  };

  // Handlers de menú contextual
  const handleMenuClick = (event, festivo) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setFestivoSeleccionado(festivo);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleItemClick = (event, festivo) => {
    // Solo abrir menú si no hay otro menú abierto
    if (!menuAnchor) {
      handleMenuClick(event, festivo);
    }
  };

  // Handlers principales
  const handleCambioAño = (nuevoAño) => {
    setAñoSeleccionado(nuevoAño);
  };

  const handleAbrirAñadir = () => {
    setFechaSeleccionada(null);
    setNombreFestivo('');
    setDialogAñadir(true);
  };

  const handleAñadirFestivo = async () => {
    if (!fechaSeleccionada || !nombreFestivo.trim()) {
      showError('Debes completar todos los campos');
      return;
    }

    try {
      await crearFestivo(añoSeleccionado, {
        fecha: formatYMD(fechaSeleccionada),
        nombre: nombreFestivo.trim()
      });
      
      showSuccess('Festivo añadido correctamente');
      setDialogAñadir(false);
      setFechaSeleccionada(null);
      setNombreFestivo('');
    } catch (error) {
      showError(error.message);
    }
  };

  const handleAbrirEditar = (festivo) => {
    setFechaSeleccionada(new Date(festivo.fecha));
    setNombreFestivo(festivo.nombre);
    setDialogEditar(true);
    handleMenuClose();
    
  };

  const handleEditarFestivo = async () => {
    if (!fechaSeleccionada || !nombreFestivo.trim()) {
      showError('Debes completar todos los campos');
      return;
    }

    try {
      await editarFestivo(añoSeleccionado, festivoSeleccionado, {
        fecha: formatYMD(fechaSeleccionada),
        nombre: nombreFestivo.trim()
      });
      
      showSuccess('Festivo actualizado correctamente');
      setDialogEditar(false);
    } catch (error) {
      showError(error.message);
    }
  };

  const handleAbrirEliminar = () => {
    setDialogEliminar(true);
    handleMenuClose();
  };

  const handleEliminarFestivo = async () => {
    try {
      await eliminarFestivo(añoSeleccionado, festivoSeleccionado);
      showSuccess('Festivo eliminado correctamente');
      setDialogEliminar(false);
    } catch (error) {
      showError(error.message);
    }
  };


  const handleCopiarFestivos = async () => {
    if (!añoOrigen) {
      showError('Debes seleccionar un año de origen');
      return;
    }

    try {
      const resultado = await copiarFestivosAño(parseInt(añoOrigen), añoSeleccionado);
      showSuccess(`Se copiaron ${resultado.copiados} festivos a ${añoSeleccionado} correctamente`);
      setDialogCopiar(false);
      setAñoOrigen('');
    } catch (error) {
      showError(error.message);
    }
  };
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      {/* AppBar */}
      <AppBar  
              sx={{ 
                overflow:'hidden',
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)',
                zIndex: 1100
              }}
            >
              <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={() => navigate('/admin/utilidades')}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)',
                      transform: 'scale(1.05)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  <ArrowBackIosNewIcon />
                </IconButton>
      
                <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
                  <Typography 
                    variant="h5" 
                    fontWeight="bold" 
                    sx={{ 
                      fontSize: { xs: '1.1rem', sm: '1.3rem' },
                      lineHeight: 1.2
                    }}
                  >
                    Gestión de Festivos
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      opacity: 0.9,
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }}
                  >
                    Configura los días de Fiesta
                  </Typography>
                </Box>
      
                <IconButton
                  edge="end"
                  color="inherit"
                  sx={{
                    cursor: 'default'
                  }}
                >
                  <EventAvailableIcon sx={{fontSize:'2rem'}}/>
                </IconButton>
              </Toolbar>
            </AppBar>

      <Container maxWidth="md" sx={{ pb: 4 }}>
        {/* Controles principales */}
        <Card sx={{ mb: 3, mt:2 }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{xs:12, sm:4}}>
                <FormControl fullWidth size="small">
                  <InputLabel>Año</InputLabel>
                  <Select
                    value={añoSeleccionado}
                    label="Año"
                    onChange={(e) => handleCambioAño(e.target.value)}
                  >
                    {añosParaSelector().map(año => (
                      <MenuItem key={año} value={año}>
                        {año}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={{xs:6, sm:4}}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ContentCopyOutlinedIcon />}
                  onClick={() => setDialogCopiar(true)}
                  sx={{
                    p:1,
                    borderColor: 'rojo.main',
                    color: 'rojo.main',
                    '&:hover': { 
                      bgcolor: 'rojo.fondoFuerte',
                      borderColor: 'rojo.main' 
                    }
                  }}
                >
                  Copiar
                </Button>
              </Grid>

              <Grid size={{xs:6, sm:4}}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAbrirAñadir}
                  sx={{
                    p:1,
                    borderColor: 'azul.main',
                    color: 'azul.main',
                    '&:hover': { 
                      bgcolor: 'azul.fondofuerte',
                      borderColor: 'azul.main' 
                    }
                  }}
                >
                  Añadir
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Lista de festivos */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5">
                Festivos {añoSeleccionado}
              </Typography>
              <Chip 
                label={`${festivosAño.length} festivos`}
                
                sx={{ bgcolor:"primary.main", color:"white"}}
                size="medium"
              />
            </Box>

            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Cargando festivos...
                </Typography>
              </Box>
            ) : festivosAño.length === 0 ? (
              <Alert severity="info" sx={{ my: 2 }}>
                No hay festivos configurados para {añoSeleccionado}.
                <br />
                Puedes añadir uno nuevo o copiar desde otro año.
              </Alert>
            ) : (
              <List>
                {festivosAño.map((festivo, index) => (
                  <ListItem
                    key={`${festivo.fecha}-${festivo.nombre}`}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'azul.fondo', borderColor:'black' }
                    }}
                    onClick={(e) => handleItemClick(e, festivo)}
                  >
                    <ListItemText
                      secondary={festivo.nombre}
                      primary={`${new Date(festivo.fecha).toLocaleDateString('es-ES', 
                        { day: 'numeric' })} de ${capitalizeFirstLetter(new Date(festivo.fecha).toLocaleDateString('es-ES', 
                        { month: 'long' }))}, ${new Date(festivo.fecha).toLocaleDateString('es-ES',
                        { weekday: 'long' })}`}
                      slotProps={{
                        primary:{
                           fontWeight: 700,
                           fontSize: '1.3rem'
                       },
                       secondary:{
                           color:'error',
                           fontWeight: 700,
                           fontSize: '1rem'
                       }
                       }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* FAB para añadir */}
        <Fab
          color="primary"
          onClick={handleAbrirAñadir}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24
          }}
        >
          <AddIcon />
        </Fab>
      </Container>

      {/* Menú contextual */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 150,
              '& .MuiMenuItem-root': {
                fontSize:'1.25rem',

                px: 2,
                py: 2,
                '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'rgba(0, 0, 255, 0.1)', // Azul con transparencia para el hover y foco
          },
          '&.Mui-selected': {
            backgroundColor: 'blue', // Azul sólido para el elemento seleccionado
            color: 'white', // Opcional: para que el texto sea legible
            '&:hover, &.Mui-focusVisible': {
              backgroundColor: 'blue', // Mantiene el color azul sólido al hacer hover en el seleccionado
            },
          },
        },
              },
          }
        }}
      >
        <MenuItem onClick={() => handleAbrirEditar(festivoSeleccionado)}
                  sx={{color:'azul.main'}}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="medium" sx={{color:'azul.main'}}/>
          </ListItemIcon>
          
          Editar
        </MenuItem>
        <MenuItem onClick={() => handleAbrirEliminar(festivoSeleccionado)} 
                  sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="medium" color="error" />
          </ListItemIcon>
          Eliminar
        </MenuItem>
      </Menu>

      {/* Dialog Añadir Festivo */}
      <Dialog
        open={dialogAñadir}
        onClose={() => setDialogAñadir(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          textAlign:'center',
          fontSize:'1.55rem',
          bgcolor:'azul.main',
          color:'white'
          }}>
          Nuevo Festivo {añoSeleccionado}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ }}>
            <DatePicker
              label="Fecha del festivo"
              value={fechaSeleccionada}
              onChange={setFechaSeleccionada}
              minDate={new Date(`${añoSeleccionado}-01-01`)}
              maxDate={new Date(`${añoSeleccionado}-12-31`)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal'
                }
              }}
            />

            <TextField
              fullWidth
              margin="normal"
              label="Nombre del festivo"
              value={nombreFestivo}
              onChange={(e) => setNombreFestivo(e.target.value)}
              placeholder="Ej: Día de Reyes"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{px:3, display:'flex', justifyContent:'space-between'}}>
          <Button onClick={() => setDialogAñadir(false)}
                  variant='outlined'
                  color='error'
                  sx={{color:'rojo.main', py:1, px:2}}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAñadirFestivo}
            variant="contained"
            disabled={!fechaSeleccionada || !nombreFestivo.trim()}
            sx={{
              py:1,          
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Editar Festivo */}
      <Dialog
        open={dialogEditar}
        onClose={() => setDialogEditar(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          textAlign:'center',
          fontSize:'1.55rem',
          bgcolor:'azul.main',
          color:'white'
          }}>Editar Festivo</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <DatePicker
              label="Fecha del festivo"
              value={fechaSeleccionada}
              onChange={setFechaSeleccionada}
              minDate={new Date(`${añoSeleccionado}-01-01`)}
              maxDate={new Date(`${añoSeleccionado}-12-31`)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal'
                }
              }}
            />

            <TextField
              fullWidth
              margin="normal"
              label="Nombre del festivo"
              value={nombreFestivo}
              onChange={(e) => setNombreFestivo(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{mb:1, px:3, display:'flex', justifyContent:'space-between'}}>
          <Button onClick={() => setDialogEditar(false)}
                  variant='outlined'
                  color='error'
                  sx={{color:'rojo.main', py:1, px:2}}>
            Cancelar
          </Button>
          <Button 
            onClick={handleEditarFestivo}
            variant="contained"
            disabled={!fechaSeleccionada || !nombreFestivo.trim()}
            sx={{ py:1, px:2}}
          >
            Actualizar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Eliminar - Modal de confirmación */}
      <Dialog
        open={dialogEliminar}
        onClose={() => setDialogEliminar(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          textAlign:'center',
          fontSize:'1.55rem',
          bgcolor:'rojo.main',
          color:'white'
          }}>Eliminar Festivo</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom sx={{mt:2}}>
            ¿Seguro que deseas eliminar este festivo? 
          </Typography>
          
          {festivoSeleccionado && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body1">
                <strong>{festivoSeleccionado.nombre}</strong>
                <br />
                {new Date(festivoSeleccionado.fecha).toLocaleDateString('es-ES', 
                        { day: 'numeric' })} de {capitalizeFirstLetter(new Date(festivoSeleccionado.fecha).toLocaleDateString('es-ES', 
                        { month: 'long' }))} de {new Date(festivoSeleccionado.fecha).toLocaleDateString('es-ES', 
                        { year: 'numeric' })}, {new Date(festivoSeleccionado.fecha).toLocaleDateString('es-ES',
                        { weekday: 'long' })}
                
              </Typography>
            </Alert>
          )}
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{mb:1, px:3, display:'flex', justifyContent:'space-between'}}>
          <Button onClick={() => setDialogEliminar(false)}
                  variant='outlined'
                  color='blue'
                  sx={{color:'azul.main', py:1, px:2}}>
            Cancelar
          </Button>
          <Button 
            onClick={handleEliminarFestivo}
            variant="contained"
            color="error"
            sx={{ py:1, px:2}}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Copiar Festivos */}
      <Dialog
        open={dialogCopiar}
        onClose={() => setDialogCopiar(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          textAlign:'center',
          fontSize:'1.55rem',
          bgcolor:'azul.main',
          color:'white'
         }}>
          Copiar Festivos a {añoSeleccionado}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Copiar desde qué año</InputLabel>
              <Select
                value={añoOrigen}
                label="Copiar desde qué año"
                onChange={(e) => setAñoOrigen(e.target.value)}
              >
                {añosDisponibles
                  .filter(año => año !== añoSeleccionado)
                  .map(año => (
                    <MenuItem key={año} value={año.toString()}>
                      {año}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mt: 2 }}>
              Los festivos se copiarán al año <strong>{añoSeleccionado}</strong>.
            </Alert>

            {añoOrigen && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Se reemplazarán todos los festivos existentes en {añoSeleccionado}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{mb:1, px:2, display:'flex', justifyContent:'space-between'}}>
          <Button onClick={() => setDialogCopiar(false)}
                  variant='outlined'
                  color='error'
                  sx={{color:'rojo.main', py:1}}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCopiarFestivos}
            variant="contained"
            disabled={!añoOrigen}
            sx={{py:1}}
          >
            Copiar Festivos
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default GestionFestivos;
