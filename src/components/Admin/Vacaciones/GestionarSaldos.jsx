// components/Admin/Vacaciones/GestionSaldos.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Chip, Alert, Grid, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Checkbox, Avatar, Fab, Dialog, DialogTitle,
  DialogContent, DialogActions, InputAdornment, Divider, List, ListItem,
  ListItemText, ListItemAvatar, CircularProgress, ButtonGroup
} from '@mui/material';
import {
  ArrowBackIosNew,
  AccountBalanceOutlined,
  Person,
  Add,
  Remove,
  EditOutlined,
  Edit,
  Search,
  FilterList,
  SelectAll,
  History,
  Save,
  Groups
} from '@mui/icons-material';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useUIStore } from '../../../stores/uiStore';
import { formatearNombre } from '../../Helpers';
import { formatearTiempoVacas, formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';
import { formatearFechaCorta } from '../../../utils/dateUtils';

const GestionarSaldos = () => {
  const navigate = useNavigate();
  const {
    obtenerEmpleadosConSaldos,
    ajustarSaldoIndividual,
    ajustarSaldosMasivo,
    obtenerHistorialAjustes
  } = useVacacionesStore();
  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [empleados, setEmpleados] = useState([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Estados de filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroSaldo, setFiltroSaldo] = useState('todos'); // todos, bajo, alto

  // Estados de dialogs
  const [dialogAjuste, setDialogAjuste] = useState(false);
  const [dialogHistorial, setDialogHistorial] = useState(false);
  const [tipoAjuste, setTipoAjuste] = useState('individual'); // individual, masivo

  // Estados de formulario
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [tipoOperacion, setTipoOperacion] = useState('añadir'); // añadir, reducir, establecer
  const [horasAjuste, setHorasAjuste] = useState('');
  const [razonAjuste, setRazonAjuste] = useState('');
  const [historialAjustes, setHistorialAjustes] = useState([]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarEmpleados();
  }, []);

  const cargarEmpleados = async () => {
    setLoading(true);
    try {
      const empleadosData = await obtenerEmpleadosConSaldos();
      setEmpleados(empleadosData);
    } catch (error) {
      showError(`Error cargando empleados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar empleados
  const empleadosFiltrados = useMemo(() => {
    let filtrados = empleados;

    // Filtro de búsqueda
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      filtrados = filtrados.filter(emp => 
        (emp.nombre || emp.email).toLowerCase().includes(termino) ||
        emp.email.toLowerCase().includes(termino) ||
        (emp.puesto || '').toLowerCase().includes(termino)
      );
    }

    // Filtro por saldo
    if (filtroSaldo !== 'todos') {
      filtrados = filtrados.filter(emp => {
        const disponibles = emp.saldoActual.disponibles || 0;
        if (filtroSaldo === 'bajo') return disponibles < 40; // Menos de 5 días
        if (filtroSaldo === 'alto') return disponibles > 120; // Más de 15 días
        return true;
      });
    }
    return filtrados;
  }, [empleados, busqueda, filtroSaldo]);

  // Handlers de selección
  const handleSeleccionarTodos = () => {
    if (empleadosSeleccionados.length === empleadosFiltrados.length) {
      setEmpleadosSeleccionados([]);
    } else {
      setEmpleadosSeleccionados(empleadosFiltrados.map(emp => emp.email));
    }
  };

  const handleSeleccionarEmpleado = (email) => {
    setEmpleadosSeleccionados(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  // Handlers de ajuste
  const handleAbrirAjusteIndividual = (empleado) => {
    setEmpleadoSeleccionado(empleado);
    setTipoAjuste('individual');
    setTipoOperacion('añadir');
    setHorasAjuste('');
    setRazonAjuste('');
    setDialogAjuste(true);
  };

  const handleAbrirAjusteMasivo = () => {
    if (empleadosSeleccionados.length === 0) {
      showError('Debes seleccionar al menos un empleado');
      return;
    }
    setTipoAjuste('masivo');
    setTipoOperacion('añadir');
    setHorasAjuste('');
    setRazonAjuste('');
    setDialogAjuste(true);
  };

  const handleConfirmarAjuste = async () => {
    if (!horasAjuste || parseInt(horasAjuste) < 0) {
      showError('Debes especificar una cantidad válida de horas');
      return;
    }

    if (!razonAjuste.trim()) {
      showError('Debes especificar una razón para el ajuste');
      return;
    }

    try {
      setProcesando(true);
      const horas = parseInt(horasAjuste);

      if (tipoAjuste === 'individual') {
        const resultado = await ajustarSaldoIndividual(
          empleadoSeleccionado.email,
          tipoOperacion,
          horas,
          razonAjuste
        );

        showSuccess(
          `Saldo ajustado correctamente. ${tipoOperacion === 'añadir' ? '+' : tipoOperacion === 'reducir' ? '-' : '='} ${horas}horas`
        );
      } else {
        const resultado = await ajustarSaldosMasivo(
          empleadosSeleccionados,
          tipoOperacion,
          horas,
          razonAjuste
        );

        if (resultado.exito) {
          showSuccess(`${resultado.procesados} saldos ajustados correctamente`);
        } else {
          showError(`${resultado.procesados} procesados, ${resultado.errores.length} errores`);
        }
        setEmpleadosSeleccionados([]);
      }

      setDialogAjuste(false);
      await cargarEmpleados(); // Recargar datos
    } catch (error) {
      showError(`Error en ajuste: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  const handleMostrarHistorial = async () => {
    try {
      setLoading(true);
      const historial = await obtenerHistorialAjustes();
      setHistorialAjustes(historial);
      setDialogHistorial(true);
    } catch (error) {
      showError(`Error cargando historial: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #6D3B07 0%, #4A2505 50%, #2D1603 100%)',
          boxShadow: '0 2px 10px rgba(109, 59, 7, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          {/* Botón Volver */}
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/admin/vacaciones')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
                transform: 'scale(1.05)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <ArrowBackIosNew />
          </IconButton>

          {/* Título del pedido */}
          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
              }}
            >
              Gestión de Saldos
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Ajustar saldo de vacaciones
            </Typography>
          </Box>

          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
            <AccountBalanceOutlined sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* Estadísticas rápidas */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper onClick={() => setFiltroSaldo('todos')}
              sx={{ p: 2, textAlign: 'center', borderRadius: 3 }}>
              <Typography variant="h4" fontWeight={600} color="primary.main">
                {empleados.length}
              </Typography>
              <Typography variant="body2">Empleados totales</Typography>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper onClick={() => setFiltroSaldo('alto')}
              sx={{ p: 2, textAlign: 'center', borderRadius: 3  }}>
              <Typography variant="h4" fontWeight={600} color="success.main">
                {empleados.filter(e => (e.saldoActual?.disponibles || 0) > 120).length}
              </Typography>
              <Typography variant="body2">Con saldo alto</Typography>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper onClick={() => setFiltroSaldo('bajo')}
              sx={{ p: 2, textAlign: 'center', borderRadius: 3  }}>
              <Typography variant="h4" fontWeight={600} color="warning.main">
                {empleados.filter(e => (e.saldoActual?.disponibles || 0) < 40).length}
              </Typography>
              <Typography variant="body2">Con saldo bajo</Typography>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3  }}>
              <Typography variant="h4" fontWeight={600} color="info.main">
                {empleadosSeleccionados.length}
              </Typography>
              <Typography variant="body2">Seleccionados</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Controles */}
        <Card elevation={5} sx={{ mb: 3 }}>
          <CardContent>
            {/* Barra de búsqueda y filtros */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                placeholder="Buscar empleado..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                size="medium"
                slotProps={{
                  input:{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }
                }}
                
              />
              <Box width='100%' display='flex' justifyContent='space-between'>
              <FormControl size="medium" sx={{ minWidth: 150 }}>
              <InputLabel>
                Filtrar por saldo
              </InputLabel>
              <Select
                value={filtroSaldo}
                label="Filtrar por saldo"
                onChange={(e) => setFiltroSaldo(e.target.value)}
                
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="bajo">Saldo bajo</MenuItem>
                <MenuItem value="alto">Saldo alto</MenuItem>
              </Select>
            </FormControl>

              <Button
                variant="outlined"
                startIcon={<History />}
                onClick={handleMostrarHistorial}
                size='medium'

                sx={{  }}

              >
                Historial
              </Button>
              </Box>
            </Box>

            {/* Acciones masivas */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSeleccionarTodos}
                size="medium"
                sx={{ 
                  p:1.5,
                  borderColor: empleadosSeleccionados.length === empleadosFiltrados.length? 'rojo.main' : 'azul.main',
                  color: empleadosSeleccionados.length === empleadosFiltrados.length ? 'black' : 'black',
                  '&:hover': { bgcolor: empleadosSeleccionados.length === empleadosFiltrados.length ? 'rojo.fondo' : 'azul.fondo' }
                }}
              >
                <Typography display='flex' alignItems='center' sx={{ fontSize:'1.1rem' }}>
                  <SelectAll sx={{fontSize:'2rem', mr:2}}/> {empleadosSeleccionados.length === empleadosFiltrados.length 
                  ? 'Deseleccionar' : 'Seleccionar'} todos
                </Typography>
              </Button>

              {empleadosSeleccionados.length > 0 && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAbrirAjusteMasivo}
                  size="medium"
                  sx={{ 
                    p:1.5,
                    bgcolor: 'azul.fondo',
                    borderColor: 'azul.main',
                    color: 'azul.main',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                    '&:hover': { bgcolor: 'azul.fondoFuerte' }
                  }}
                >
                  <Typography display='flex' alignItems='center' sx={{ fontSize:'1.1rem', fontWeight:700 }}>
                 <Groups sx={{fontSize:'2rem', mr:2}}/> Ajuste Masivo ({empleadosSeleccionados.length})
                 </Typography>
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>

      {/* Tabla de empleados */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>Cargando empleados...</Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          
          {empleadosFiltrados.map((empleado) => {
            
            const saldo = empleado.saldoActual || { asignadas: 0, disponibles: 0, pendientes: 0 };
            const estaSeleccionado = empleadosSeleccionados.includes(empleado.email);
            
            return (
              <Card 
                key={empleado.email} 
                  onClick={() => handleAbrirAjusteIndividual(empleado)}
                  sx={{
                  cursor: 'pointer',
                  mb: 3,
                  border: estaSeleccionado ? 2 : 1,
                  borderColor: estaSeleccionado ? 'azul.main' : 'azul.fondoFuerte',
                  bgcolor: estaSeleccionado ? 'azul.fondo' : 'white',
                  transform: estaSeleccionado ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: 3,
                    transform: estaSeleccionado ? 'scale(1.03)' : 'scale(1.01)',
                  }
                }}
              >
                <CardContent sx={{ p: 1, mb:-2 }}>
                  {/* Header de la card */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mt:1, width: '100%' }}>
                      <Checkbox 
                        checked={estaSeleccionado}
                        onChange={() => handleSeleccionarEmpleado(empleado.email)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ 
                          ml:-1,
                          color: 'azul.main',
                          '&.Mui-checked': { color: 'azul.main' }
                        }}
                      />
                      <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
                        <Typography  fontSize='1.35rem'  fontWeight={600}>
                          {empleado.nombre}
                        </Typography>
                      </Box>
                    <Box sx={{ width: '40px' }} /> {/* Un placeholder que simula el ancho del Checkbox */}

                  </Box>

                  {/* Información del empleado */}
                  <Grid container sx={{mt:1}}>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <Box sx={{ textAlign: 'center', width:'100%', bgcolor:'dorado.fondo' }}>
                        <Typography variant="h6" fontWeight={500}>
                          VACACIONES
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography fontSize='1.2rem' display="block">
                          Disponibles
                        </Typography>
                        <Chip 
                          label={formatearTiempoVacasLargo(saldo.disponibles)}
                          color={
                            saldo.disponibles < 40 ? 'warning' : 
                            saldo.disponibles > 120 ? 'success' : 'default'
                          }
                          
                          sx={{ fontWeight: 600, mt:0.5, fontSize:'1rem' }}
                        />
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <Typography fontSize='1.2rem' display="block">
                          Pendientes
                        </Typography>
                        <Chip 
                          label={formatearTiempoVacasLargo(saldo.pendientes)}
                          color={saldo.pendientes > 0 ? 'secondary' : 'default'}
                          sx={{ fontWeight: 600,mt:0.5, fontSize:'1rem' }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            );
          })}

          {/* Mensaje si no hay empleados */}
          {empleadosFiltrados.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                No se encontraron empleados
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ajusta los filtros de búsqueda para ver más resultados
              </Typography>
            </Box>
          )}
        </Box>
      )}

      </Container>

      {/* Dialog de Ajuste de Saldo */}
      <Dialog
        open={dialogAjuste}
        onClose={() => !procesando && setDialogAjuste(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle component='div' bgcolor="primary.main" color='white' display='flex' justifyContent='center'>
          <Typography  fontSize='1.75rem' fontWeight={600}>
          {tipoAjuste === 'individual' 
            ? 'Ajustar Saldo'
            : 'Ajuste Masivo'
          }
          </Typography>
        </DialogTitle>
        
        <DialogContent component='div' sx={{textAlign:'center', my:2}}>
          <Typography   fontSize='1.5rem' fontWeight={600}>
          {tipoAjuste === 'individual' 
            ? empleadoSeleccionado?.nombre
            : `${empleadosSeleccionados.length} empleados`
          }
          </Typography>
          {tipoAjuste === 'individual' && empleadoSeleccionado && (
            <Alert severity="info" sx={{ my: 2 }}>
              <Typography variant="body1" textAlign={'left'}>
                <strong>Saldo actual:</strong> {formatearTiempoVacasLargo(empleadoSeleccionado.saldoActual?.disponibles || 0)} disponibles
              </Typography>
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth sx={{mt:2}}>
                <InputLabel >Tipo de operación</InputLabel>
                <Select
                  value={tipoOperacion}
                  label="Tipo de operación"
                  onChange={(e) => setTipoOperacion(e.target.value)}
                  disabled={procesando}
                >
                  <MenuItem value="añadir">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Add color="success" />
                      Añadir horas
                    </Box>
                  </MenuItem>
                  <MenuItem value="reducir">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Remove color="error" />
                      Reducir horas
                    </Box>
                  </MenuItem>
                  <MenuItem value="establecer">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Edit color="primary" />
                      Establecer total
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                sx={{ mb: 1 }}
                fullWidth
                label="Horas"
                type="number"
                value={horasAjuste}
                onChange={(e) => setHorasAjuste(e.target.value)}
                disabled={procesando}
                onWheel={(e) => e.target.blur()}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">horas</InputAdornment>,
                  },
                  htmlInput:{ 
                    min: 1, step: 1 
                  }
                }}
                helperText={
                  horasAjuste 
                  ? <Typography component="span" fontSize='1rem' sx={{fontWeight:700 }}>
                   {formatearTiempoVacasLargo(horasAjuste)}
                   </Typography>
                  : <Typography component="span" fontSize='0.8rem' sx={{fontWeight:700 }}>
                    Especifica la cantidad de horas
                  </Typography>
                }
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Razón del ajuste"
                value={razonAjuste}
                onChange={(e) => setRazonAjuste(e.target.value)}
                disabled={procesando}
                placeholder="Ej: Corrección de error sistema, baja médica prolongada..."
                required
                helperText={
                  <Typography component='span' fontSize='0.9rem' >
                  Especifica el motivo del ajuste
                  </Typography>}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', p: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDialogAjuste(false)}
            disabled={procesando}
            color={tipoOperacion=="reducir"?'primary':"error"}
            sx={{p:1.5, textTransform:'none'}}
          >
            <Typography sx={{ fontSize:'1.15rem' }}>
            Cancelar
            </Typography>
          </Button>
          <Button
            onClick={handleConfirmarAjuste}
            disabled={procesando || !horasAjuste || !razonAjuste.trim()}
            variant="contained"
            color={tipoOperacion=="añadir"?"success":tipoOperacion=="reducir"?'error':"primary"}
            sx={{p:1.5, textTransform:'none'}}
          >
            <Typography sx={{ fontSize:'1.15rem' }}>
            {procesando 
              ? 'Procesando...' 
              : tipoOperacion==="añadir" 
                  ? "Añadir Horas"
                  :tipoOperacion==="reducir"
                    ?'Reducir Horas'
                    :"Establecer Total"
              }        
            </Typography>
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Historial */}
      <Dialog
        open={dialogHistorial}
        onClose={() => setDialogHistorial(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{display:'flex', justifyContent:'center', bgcolor:'dorado.main', color:'white'
        }}>
          <Typography  textAlign='center' component='span' fontSize='1.2rem' fontWeight={600}>
          Historial de Ajustes de Saldo
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          {historialAjustes.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body1">
              No hay ajustes de saldo registrados
              </Typography>
            </Alert>
          ) : (
            <List sx={{ ml:-2 }}>
              {historialAjustes.map((ajuste, index) => (
                <React.Fragment key={ajuste.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: ajuste.tipoAjuste === 'añadir' ? 'success.main' : 
                                ajuste.tipoAjuste === 'reducir' ? 'error.main' : 'primary.main' 
                      }}>
                        {ajuste.tipoAjuste === 'añadir' ? <Add /> : 
                         ajuste.tipoAjuste === 'reducir' ? <Remove /> : <Edit />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                      
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent:'flex-end', mt:1 }}>
                          <Chip 
                            label={`${ajuste.tipoAjuste} ${ajuste.horasSolicitadas}h`}
                            size="small"
                            color={
                              ajuste.tipoAjuste === 'añadir' ? 'success' :
                              ajuste.tipoAjuste === 'reducir' ? 'error' : 'primary'
                            }
                          />
                        </Box>
                        
                      }
                      secondary={
                        <Box component={'span'} sx={{display:'flex', flexDirection:'column', gap:0.5, mt:2  }}>
                          <Typography component='span' variant="body1"  fontWeight={700} color='black'>
                            {ajuste.solicitanteNombre || ajuste.solicitante}
                          </Typography>
                          <Typography component='span' variant="body2" fontStyle={'italic'}>
                            {ajuste.motivoAjuste}
                          </Typography>
                          <Typography component='span' variant="subtitle2" >
                            {formatearFechaCorta(ajuste.fechaSolicitud)}
                          </Typography>
                          <Typography component='span' variant="subtitle2" >
                            Por: {ajuste.realizadoPorNombre}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < historialAjustes.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        
        <DialogActions sx={{mt:1}}>
          <Button 
            onClick={() => setDialogHistorial(false)}
            variant='outlined'
            color='error'
            sx={{p:1.5, px:3, textTransform:'none'}}  
          >
            <Typography sx={{ fontSize:'1.25rem' }}>
            Cerrar
            </Typography>
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GestionarSaldos;
