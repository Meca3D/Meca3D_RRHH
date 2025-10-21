// components/Admin/Nomina/GestionNivelesSalariales.jsx

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Grid, CircularProgress, Menu, ListItemIcon, Alert
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  AttachMoney as AttachMoneyIcon,
  EditOutlined as EditOutlinedIcon,
  ContentCopyOutlined as ContentCopyOutlinedIcon,
  TrendingUp as TrendingUpIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useNominaStore } from '../../../stores/nominaStore';
import { useUIStore } from '../../../stores/uiStore';

const GestionNivelesSalariales = () => {
  const navigate = useNavigate();
  
  const {
    nivelesSalariales,
    loading,
    loadNivelesSalarialesAno,
    editarNivelSalarial,
    copiarNivelesAño,
    aplicarIncrementoMasivo,
    obtenerAñosConNiveles
  } = useNominaStore();

  const { showSuccess, showError } = useUIStore();

  // Estados principales
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());
  const [añosDisponibles, setAñosDisponibles] = useState([]);

  // Estados para menú contextual
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [nivelSeleccionado, setNivelSeleccionado] = useState(null);

  // Estados para dialogs
  const [dialogEditar, setDialogEditar] = useState(false);
  const [dialogCopiar, setDialogCopiar] = useState(false);
  const [dialogIncremento, setDialogIncremento] = useState(false);

  // Estados para formularios
  const [sueldoBase, setSueldoBase] = useState('');
  const [valorTrienio, setValorTrienio] = useState('');
  const [añoOrigen, setAñoOrigen] = useState('');
  const [porcentajeIncremento, setPorcentajeIncremento] = useState('');
  const [aplicarASueldo, setAplicarASueldo] = useState(true);
  const [aplicarATrienio, setAplicarATrienio] = useState(false);

  // Estado para confirmación de copiar
  const [existenDatosDestino, setExistenDatosDestino] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      const unsubscribe = loadNivelesSalarialesAno(añoSeleccionado);
      const años = await obtenerAñosConNiveles();
      setAñosDisponibles(años);
      return unsubscribe;
    };

    let cleanup;
    cargarDatos().then(unsubscribe => {
      cleanup = unsubscribe;
    });

    return () => cleanup && cleanup();
  }, [añoSeleccionado, loadNivelesSalarialesAno, obtenerAñosConNiveles]);

  // Convertir niveles a array ordenado
  const nivelesArray = useMemo(() => {
    return Object.entries(nivelesSalariales || {})
      .map(([num, datos]) => ({ numero: parseInt(num), ...datos }))
      .sort((a, b) => a.numero - b.numero);
  }, [nivelesSalariales]);

  // Generar opciones de años
  const añosParaSelector = () => {
    const añoActual = new Date().getFullYear();
    const años = [];
    for (let i = añoActual - 2; i <= añoActual + 5; i++) {
      años.push(i);
    }
    return años;
  };

  // Handlers de menú contextual
  const handleMenuClick = (event, nivel) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setNivelSeleccionado(nivel);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  // Handlers principales
  const handleCambioAño = (nuevoAño) => {
    setAñoSeleccionado(nuevoAño);
  };

  const handleAbrirEditar = (nivel) => {
    setSueldoBase(nivel.sueldoBase.toString());
    setValorTrienio(nivel.valorTrienio.toString());
    setDialogEditar(true);
    handleMenuClose();
  };

  const handleEditarNivel = async () => {
    if (!sueldoBase || !valorTrienio) {
      showError('Debes completar todos los campos');
      return;
    }

    const sueldoNum = parseFloat(sueldoBase);
    const trienioNum = parseFloat(valorTrienio);

    if (isNaN(sueldoNum) || isNaN(trienioNum) || sueldoNum < 0 || trienioNum < 0) {
      showError('Los valores deben ser números positivos');
      return;
    }

    try {
      await editarNivelSalarial(añoSeleccionado, nivelSeleccionado.numero, {
        sueldoBase: sueldoNum,
        valorTrienio: trienioNum
      });
      showSuccess('Nivel actualizado correctamente');
      setDialogEditar(false);
    } catch (error) {
      showError(error.message);
    }
  };

  const handleAbrirCopiar = async () => {
    // Verificar si ya existen datos en el año destino
    const tieneNiveles = nivelesArray.length > 0;
    setExistenDatosDestino(tieneNiveles);
    setAñoOrigen('');
    setDialogCopiar(true);
  };

  const handleCopiarNiveles = async () => {
    if (!añoOrigen) {
      showError('Debes seleccionar un año de origen');
      return;
    }

    try {
      const resultado = await copiarNivelesAño(parseInt(añoOrigen), añoSeleccionado);
      showSuccess(`Se copiaron ${resultado.copiados} niveles a ${añoSeleccionado} correctamente`);
      setDialogCopiar(false);
      setAñoOrigen('');
    } catch (error) {
      showError(error.message);
    }
  };

  const handleAbrirIncremento = () => {
    setPorcentajeIncremento('');
    setAplicarASueldo(true);
    setAplicarATrienio(false);
    setDialogIncremento(true);
  };

  const handleAplicarIncremento = async () => {
    const porcentaje = parseFloat(porcentajeIncremento);

    if (isNaN(porcentaje) || porcentaje === 0) {
      showError('Debes introducir un porcentaje válido');
      return;
    }

    if (!aplicarASueldo && !aplicarATrienio) {
      showError('Debes seleccionar al menos un campo para aplicar el incremento');
      return;
    }

    try {
      const resultado = await aplicarIncrementoMasivo(
        añoSeleccionado,
        porcentaje,
        aplicarASueldo,
        aplicarATrienio
      );
      showSuccess(
        `Incremento del ${resultado.porcentaje}% aplicado a ${resultado.actualizados} niveles`
      );
      setDialogIncremento(false);
    } catch (error) {
      showError(error.message);
    }
  };

  return (
    <>
        <AppBar  
           sx={{ 
             overflow:'hidden',
             background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
             boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
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
            {/* Título */}
            <Box sx={{ my:0.5, textAlign: 'center', flex: 1}}>
                <Typography 
                variant="h5" 
                fontWeight="bold" 
                sx={{ 
                    fontSize: { xs: '1.1rem', sm: '1.3rem' },
                    lineHeight: 1.2
                }}
                >
                Niveles Salariales
                </Typography>
            <Typography 
                    variant="caption" 
                    sx={{ 
                    opacity: 0.9,
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                    }}
                >
                    Gestiona el sueldo de cada nivel
                </Typography>
                </Box>                  
                <IconButton
                edge="end"
                color="inherit"
                sx={{
                    cursor: 'default'
                }}
                >
                <AttachMoneyIcon  sx={{fontSize:'2rem'}}/>
                </IconButton>
            </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ pb: 4,px:1 }}>

      {/* Controles principales */}
      <Grid container spacing={2} sx={{ mb: 3, mt:2 }}>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Año</InputLabel>
            <Select
              value={añoSeleccionado}
              onChange={(e) => handleCambioAño(e.target.value)}
              label="Año"
            >
              {añosParaSelector().map(año => (
                <MenuItem key={año} value={año}>{año}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleAbrirCopiar}
            sx={{
              gap:1.5,
              textTransform:'none',
              p: 1.5,
              borderColor: 'rojo.main',
              color: 'rojo.main',
              '&:hover': {
                bgcolor: 'rojo.fondoFuerte',
                borderColor: 'rojo.main'
              }
            }}
          >
            <ContentCopyOutlinedIcon />
            <Typography sx={{fontSize:'1.25rem'}}>
            Copiar Año
            </Typography>
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 5 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleAbrirIncremento}
            sx={{
              textTransform:'none',
              p: 1.5,
              gap: 2,
              borderColor: 'verde.main',
              color: 'verde.main',
              '&:hover': {
                bgcolor: 'verde.fondofuerte',
                borderColor: 'verde.main'
              }
            }}
          >
            <TrendingUpIcon />
            <Typography sx={{fontSize:'1.25rem'}}>
            Aplicar incremento masivo
            </Typography>
          </Button>
        </Grid>
      </Grid>

      {/* Lista de niveles */}
      <Typography variant="h6" sx={{ textAlign:'center', mt:2, mb: 1, fontWeight: 600 }}>
        Niveles Salariales {añoSeleccionado}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando niveles...</Typography>
        </Box>
      ) : nivelesArray.length === 0 ? (
        <Alert severity="info">
          No hay niveles configurados para {añoSeleccionado}.
          Puedes copiarlos desde otro año.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {nivelesArray.map((nivel) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={nivel.numero}>
              <Card
                sx={{
                  position: 'relative',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s'
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'azul.main' }}>
                      Nivel {nivel.numero}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, nivel)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ mt: 2, display:'flex', justifyContent:'space-around', alignItems:'center' }}>
                    <Box sx={{textAlign:'center'}}>
                    <Typography variant="body1" color="text.secondary">
                      Sueldo Base
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'verde.main' }}>
                      {nivel.sueldoBase.toFixed(2)} €
                    </Typography>
                  </Box>

                  <Box sx={{textAlign:'center'}}>
                    <Typography variant="body1" color="text.secondary">
                      Valor Trienio
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {nivel.valorTrienio.toFixed(2)} €
                    </Typography>
                  </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Menú contextual */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => nivelSeleccionado && handleAbrirEditar(nivelSeleccionado)}
          sx={{ color: 'azul.main' }}
        >
          <ListItemIcon>
            <EditOutlinedIcon sx={{ color: 'azul.main' }} />
          </ListItemIcon>
          Editar
        </MenuItem>
      </Menu>

      {/* Dialog Editar Nivel */}
      <Dialog
        open={dialogEditar}
        onClose={() => setDialogEditar(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Editar Nivel {nivelSeleccionado?.numero}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Sueldo Base (€)"
              type="number"
              value={sueldoBase}
              onChange={(e) => setSueldoBase(e.target.value)}
              inputProps={{ step: "0.01", min: "0" }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Valor Trienio (€)"
              type="number"
              value={valorTrienio}
              onChange={(e) => setValorTrienio(e.target.value)}
              inputProps={{ step: "0.01", min: "0" }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialogEditar(false)}
            variant="outlined"
            color="error"
            sx={{ color: 'rojo.main', py: 1, px: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEditarNivel}
            variant="contained"
            sx={{ bgcolor: 'azul.main', py: 1, px: 2 }}
          >
            Actualizar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Copiar Niveles */}
      <Dialog
        open={dialogCopiar}
        onClose={() => setDialogCopiar(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Copiar Niveles a {añoSeleccionado}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Copiar desde qué año</InputLabel>
              <Select
                value={añoOrigen}
                onChange={(e) => setAñoOrigen(e.target.value)}
                label="Copiar desde qué año"
              >
                {añosDisponibles
                  .filter(año => año !== añoSeleccionado)
                  .map(año => (
                    <MenuItem key={año} value={año}>{año}</MenuItem>
                  ))}
              </Select>
            </FormControl>
            
            <Typography variant="body2" color="text.secondary">
              Los niveles se copiarán al año {añoSeleccionado}.
            </Typography>
            
            {existenDatosDestino && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Ya existen niveles en {añoSeleccionado}. Se reemplazarán todos los datos existentes.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialogCopiar(false)}
            variant="outlined"
            color="error"
            sx={{ color: 'rojo.main', py: 1 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCopiarNiveles}
            variant="contained"
            sx={{ bgcolor: 'rojo.main', py: 1 }}
            disabled={!añoOrigen}
          >
            Copiar Niveles
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Incremento Masivo */}
      <Dialog
        open={dialogIncremento}
        onClose={() => setDialogIncremento(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Aplicar Incremento Masivo - {añoSeleccionado}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Porcentaje de incremento (%)"
              type="number"
              value={porcentajeIncremento}
              onChange={(e) => setPorcentajeIncremento(e.target.value)}
              inputProps={{ step: "0.01" }}
              placeholder="Ej: 2 para 2%, -1.5 para -1.5%"
              sx={{ mb: 3 }}
            />

            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Aplicar incremento a:
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={aplicarASueldo}
                  onChange={(e) => setAplicarASueldo(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                <Typography variant="body2">Sueldo Base</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={aplicarATrienio}
                  onChange={(e) => setAplicarATrienio(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                <Typography variant="body2">Valor Trienio</Typography>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              Este incremento se aplicará a todos los niveles del año {añoSeleccionado}.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialogIncremento(false)}
            variant="outlined"
            color="error"
            sx={{ color: 'rojo.main', py: 1 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAplicarIncremento}
            variant="contained"
            sx={{ bgcolor: 'verde.main', py: 1 }}
            disabled={!porcentajeIncremento}
          >
            Aplicar Incremento
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </>
  );
};

export default GestionNivelesSalariales;
