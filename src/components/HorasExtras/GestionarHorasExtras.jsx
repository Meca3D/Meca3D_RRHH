// components/HorasExtras/GestionarHorasExtras.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Card, CardContent, TextField, Button, Divider,
  AppBar, Toolbar, IconButton, Alert, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, Chip, Paper, Menu, ListItemIcon,ListItemText
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  ArrowBackIosNew as ArrowBackIosNewIcon,
  EditOutlined as EditIcon,
  Delete as DeleteIcon,
  List as ListIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useHorasExtraStore } from '../../stores/horasExtraStore';
import { useUIStore } from '../../stores/uiStore';
import { useNominaStore } from '../../stores/nominaStore';
import { 
  tiposHorasExtra, 
  formatCurrency, 
  formatDate, 
  formatearTiempo 
} from '../../utils/nominaUtils';

const GestionarHorasExtras = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { 
    horasExtra, 
    fetchHorasExtra, 
    updateHorasExtra,
    deleteHorasExtra, 
    calcularTotalHorasDecimales,
    calcularTotalHorasExtra,
    calcularImporteHorasExtra,
    loading 
  } = useHorasExtraStore();
  const { obtenerPeriodoHorasExtras } = useNominaStore();
  const { showSuccess, showError } = useUIStore();

  // Estados para filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  // Estados para modals
  const [editDialog, setEditDialog] = useState({ open: false, horaExtra: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, horaExtra: null });
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [menuState, setMenuState] = useState({ anchorEl: null, horaExtra: null });


  // ✅ Cargar datos cuando cambien los filtros
  useEffect(() => {
    if (user?.email && fechaInicio && fechaFin) {
      const unsubscribe = fetchHorasExtra(user.email, fechaInicio, fechaFin);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user?.email, fechaInicio, fechaFin]);

  // ✅ Establecer período por defecto (mes actual)
  useEffect(() => {
    //const now = new Date();
    //const firstDay = new Date(now.getFullYear(), now.getMonth(), -7).toISOString().split('T')[0];
    //const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, -7).toISOString().split('T')[0];
    
    //setFechaInicio(firstDay);
    //setFechaFin(lastDay);

     const setDefaultPeriod = async () => {
      const now = new Date();
      let lastDay = new Date(now.getFullYear(), now.getMonth() + 1, -6).toISOString().split('T')[0]

      let calculatedFirstDay;
        const periodoAnterior = await obtenerPeriodoHorasExtras(user.email, 1); // 1 month back
        const periodoActual = await obtenerPeriodoHorasExtras(user.email,0)
        if (periodoAnterior.encontrada) {
          const inicioNuevo = new Date(periodoAnterior.fechaFin);
          inicioNuevo.setDate(inicioNuevo.getDate() + 1);
          calculatedFirstDay = inicioNuevo.toISOString().split('T')[0];
        } else {
          // Default logic: 7 days before the current date if no previous nomina
          const defaultFirstDay = new Date(now.getFullYear(), now.getMonth(), - 7);
          calculatedFirstDay = defaultFirstDay.toISOString().split('T')[0];
        }
        if (periodoActual.encontrada) {
          calculatedFirstDay = new Date(periodoActual.fechaInicio).toISOString().split('T')[0];;
          lastDay = new Date(periodoActual.fechaFin).toISOString().split('T')[0];;
        } 
      
      setFechaInicio(calculatedFirstDay);
      setFechaFin(lastDay);
    };

    setDefaultPeriod();
  }, []);

  const handleEdit = (horaExtra) => {
    setEditFormData({
      fecha: horaExtra.fecha,
      tipo: horaExtra.tipo,
      horas: horaExtra.horas || 0,
      minutos: horaExtra.minutos || 0,
      tarifa: horaExtra.tarifa
    });
    setEditDialog({ open: true, horaExtra });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      // ✅ Recalcular importe con los nuevos datos
      const nuevoImporte = calcularImporteHorasExtra(
        editFormData.horas,
        editFormData.minutos,
        editFormData.tarifa
      );

      const datosActualizados = {
        ...editFormData,
        horas: parseInt(editFormData.horas) || 0,
        minutos: parseInt(editFormData.minutos) || 0,
        tarifa: parseFloat(editFormData.tarifa),
        importe: nuevoImporte
      };

      await updateHorasExtra(editDialog.horaExtra.id, datosActualizados);
      setEditDialog({ open: false, horaExtra: null });
      showSuccess('Registro actualizado correctamente');
    } catch (error) {
      showError('Error al actualizar registro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteHorasExtra(deleteDialog.horaExtra.id);
      setDeleteDialog({ open: false, horaExtra: null });
      showSuccess('Registro eliminado correctamente');
    } catch (error) {
      showError('Error al eliminar registro: ' + error.message);
    }
  };

      const handleMenuOpen = (event, horaExtra) => {
      event.stopPropagation();
      setMenuState({ anchorEl: event.currentTarget, horaExtra });
    };

    const handleMenuClose = () => {
      setMenuState({ anchorEl: null, horaExtra: null });
    };

    const handleMenuEdit = () => {
      if (menuState.horaExtra) {
        handleEdit(menuState.horaExtra);
      }
      handleMenuClose();
    };

    const handleMenuDelete = () => {
      if (menuState.horaExtra) {
        setDeleteDialog({ open: true, horaExtra: menuState.horaExtra });
      }
      handleMenuClose();
    };


  // ✅ Actualizar tarifa según tipo en modal de edición
  const handleTipoChange = (tipo) => {
    const tarifas = userProfile?.tarifasHorasExtra || {};
    const tarifa = tarifas[tipo] || 15;
    
    setEditFormData({
      ...editFormData,
      tipo,
      tarifa
    });
  };

  const getTipoInfo = (tipo) => {
    return tiposHorasExtra.find(t => t.value === tipo) || { label: tipo, color: '#666' };
  };

  // ✅ Calcular estadísticas del período
  const totalHorasDecimales = calcularTotalHorasDecimales(horasExtra);
  const totalImporte = calcularTotalHorasExtra(horasExtra);
  const horasTotales = Math.floor(totalHorasDecimales);
  const minutosTotales = Math.round((totalHorasDecimales % 1) * 60);

  // ✅ Importe calculado en tiempo real en modal de edición
  const importeCalculadoEdit = calcularImporteHorasExtra(
    editFormData.horas || 0,
    editFormData.minutos || 0,
    editFormData.tarifa || 0
  );

  return (
    <>
      {/* ✅ AppBar como RegistrarHorasExtras */}
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #1E40AF 100%)',
          boxShadow: '0 2px 10px rgba(59, 130, 246, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          {/* Botón Volver */}
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/horas-extras')}
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

          {/* Título */}
          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
              }}
            >
              Gestionar Horas Extras
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Consultar, Modificar y Eliminar
            </Typography>
          </Box>
          {/* Icono decorativo */}
          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
            <EditIcon sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 2, mb: 4, overflow:'hidden' }}>
        {/* Filtros de período */}
        <Card elevation={5} sx={{ mb: 3, borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3,  }}>
            <Box sx={{display:'flex', justifyContent:'center', mb:1}}>
            <Typography variant="h6" gutterBottom color='azul.main'>
              <TimeIcon sx={{ mr: 1,  verticalAlign: 'middle' }} />
              Filtrar por período
            </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  type="date"
                  label="Fecha de inicio"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'azul.main'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'azul.main'
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'azul.main'
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  type="date"
                  label="Fecha de fin"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'azul.main'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'azul.main'
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'azul.main'
                    }
                  }}
                />
              </Grid>
            </Grid>

            {fechaInicio && fechaFin && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body1">
                  <strong>Período seleccionado:</strong> {formatDate(fechaInicio)} - {formatDate(fechaFin)}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Resumen de estadísticas */}
        {horasExtra.length > 0 && (
          <Paper elevation={5} sx={{p: 2, mb: 3, borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Grid container spacing={1}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="azul.main">
                    {horasExtra.length}
                  </Typography>
                  <Typography variant="body1">Registros</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {formatearTiempo(horasTotales, minutosTotales)}
                  </Typography>
                  <Typography variant="body1">Tiempo Total</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box textAlign="center">
                  <Typography variant="h5" color="success.main">
                    {formatCurrency(totalImporte)}
                  </Typography>
                  <Typography variant="body1">Importe Total</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Lista de horas extra */}
        <Card elevation={5} sx={{ borderRadius: 4, border: 'px solid rgba(0,0,0,0.08)' }}>
          <CardContent>
            {loading ? (
              <Box textAlign="center" p={4}>
                <CircularProgress />
                <Typography>Cargando registros...</Typography>
              </Box>
            ) : horasExtra.length === 0 ? (
              <Alert sx={{mb:-1}} severity="info">
                {!fechaInicio || !fechaFin ? 
                  'Selecciona un período para ver los registros' :
                  'No hay registros en este período'
                }
              </Alert>
            ) : (
              
              <Box>
                <Typography sx={{my:1, fontWeight:'bold' }} variant="h6" textAlign='center' color='azul.main'>
                Pulsa para editar/borrar
              </Typography>
                {/* Header de tabla */}
                <Box display="flex" justifyContent='space-around' mb={1} py={1} fontWeight="bold" bgcolor="grey.100" borderRadius={0}>
                  <Typography sx={{ fontWeight:'bold' }}>Fecha</Typography>
                  <Typography sx={{ fontWeight:'bold'}}>Tipo</Typography>
                  <Typography sx={{  fontWeight:'bold' }}>Tiempo</Typography>
                </Box>

                {/* Filas de datos */}
                {horasExtra.map((hora) => {
                  const tipoInfo = getTipoInfo(hora.tipo);
                  return (
                    <Box
                      key={hora.id}
                      onClick={(e) => !hora.esVenta && handleMenuOpen(e, hora)}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        mb: 1,
                        bgcolor: hora.esVenta? 'verde.fondo':'background.paper',
                        borderRadius: 1,
                        boxShadow: 1,
                        cursor: hora.esVenta ? 'default' : 'pointer',
                        '&:hover': {
                          bgcolor: hora.esVenta ? 'verde.fondo' : 'action.hover',
                          transform: hora.esVenta ? 'none' : 'translateX(4px)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Typography sx={{ flex: 1, fontSize: '0.9rem' }}>
                        {formatDate(hora.fecha)}
                      </Typography>
                      <Typography sx={{ fontWeight:700, flex:1, textAlign:'center', fontSize:'0.9rem', color: hora.esVenta? 'black': tipoInfo.color }}>
                        {hora.esVenta ? 'Venta de Vacaciones' : tipoInfo.label}
                      </Typography>
                      <Typography sx={{ flex: 1, textAlign: 'center', fontSize:'1rem' }}>
                        {formatearTiempo(hora.horas || 0, hora.minutos || 0)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Modal de edición */}
      <Dialog variant="div" open={editDialog.open} onClose={() => setEditDialog({ open: false, horaExtra: null })} maxWidth="md" fullWidth>
        <DialogTitle component='div'>
          <Typography textAlign='center' variant="h6" fontWeight="bold" color="azul.main">
            Modificar Horas Extra
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                type="date"
                label="Fecha"
                value={editFormData.fecha || ''}
                onChange={(e) => setEditFormData({ ...editFormData, fecha: e.target.value })}
                fullWidth
                focused
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                label="Tipo"
                value={editFormData.tipo || ''}
                onChange={(e) => handleTipoChange(e.target.value)}
                fullWidth
              >
                {tiposHorasExtra.map((tipo) => (
                  <MenuItem key={tipo.value} value={tipo.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 12, height: 12, bgcolor: tipo.color, borderRadius: '50%' }} />
                      {tipo.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                type="number"
                label="Horas"
                value={editFormData.horas || 0}
                onChange={(e) => setEditFormData({ ...editFormData, horas: Math.max(0, parseInt(e.target.value) || 0) })}
                slotProps={{ 
                  htmlInput:{ 
                    min: 0, max: 24 
                }
              }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                type="number"
                label="Minutos"
                value={editFormData.minutos || 0}
                onChange={(e) => setEditFormData({ ...editFormData, minutos: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                slotProps={{ 
                  htmlInput:{ 
                    min: 0, max: 59 
                }
              }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                type="number"
                label="Precio (€/hora)"
                value={editFormData.tarifa || 0}
                onChange={(e) => setEditFormData({ ...editFormData, tarifa: parseFloat(e.target.value) || 0 })}
                slotProps={{ 
                  htmlInput:{  
                    min: 0, step: 0.01
                 }
                }}
                fullWidth
              />
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body1">
              <strong>Nuevo importe:</strong> {formatCurrency(importeCalculadoEdit)}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{p:2, display:'flex', justifyContent:'space-between' }}>
          <Button 
            variant="outlined"
            color='warning'
            
            sx={{bgcolor:'rojo.fondo'}}
            onClick={() => setEditDialog({ open: false, horaExtra: null })}
            startIcon={<CancelIcon />}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveEdit}
            disabled={saving}
            startIcon={<SaveIcon />}
            sx={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
              }
            }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, horaExtra: null })}>
        <DialogContent>
          <Box  textAlign="center">
          <Typography variant='body1'>
            ¿Estás seguro de que quieres <Box component="span" sx={{ color: 'rojo.main', fontWeight: 'bold' }}>eliminar</Box> este registro?
          </Typography>
          </Box>
          {deleteDialog.horaExtra && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rojo.fondo', borderRadius: 2 }}>
              <Typography variant="body1">
                <strong>Fecha:</strong> {formatDate(deleteDialog.horaExtra.fecha)}
              </Typography>
              <Typography variant="body1">
                <strong>Tipo:</strong> {getTipoInfo(deleteDialog.horaExtra.tipo).label}
              </Typography>
              <Typography variant="body1">
                <strong>Tiempo:</strong> {formatearTiempo(deleteDialog.horaExtra.horas || 0, deleteDialog.horaExtra.minutos || 0)}
              </Typography>
              <Typography variant="body1">
                <strong>Importe:</strong> {formatCurrency(deleteDialog.horaExtra.importe)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between'}}>
          
          <Button variant='outlined' sx={{bgcolor:'azul.fondo'}} onClick={() => setDeleteDialog({ open: false, horaExtra: null })}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      {/* Menú contextual */}
      <Menu
        anchorEl={menuState.anchorEl}
        open={Boolean(menuState.anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleMenuEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </Menu>

    </>
  );
};

export default GestionarHorasExtras;
