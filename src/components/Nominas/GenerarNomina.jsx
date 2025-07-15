import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar, FormControlLabel, Switch,
  IconButton, Button, Grid, TextField, Divider, Alert, CircularProgress, Paper
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  Receipt as ReceiptIcon,
  Save as SaveIcon,
  CalendarMonth as CalendarMonthIcon,
  AccessTime as TimeIcon,
  Wysiwyg as WysiwygIcon  
} from '@mui/icons-material';
import { useHorasExtraStore } from '../../stores/horasExtraStore';
import { useAuthStore } from '../../stores/authStore';
import { useNominaStore } from '../../stores/nominaStore';
import { useUIStore } from '../../stores/uiStore';
import { 
  tiposHorasExtra, 
  formatCurrency, 
  formatDate, 
  formatearTiempo 
} from '../../utils/nominaUtils';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import 'dayjs/locale/es'
import es from 'dayjs/locale/es';
import { capitalizeFirstLetter } from '../Helpers';
import { obtenerNumeroMes } from '../Helpers';


const GenerarNomina = () => {
  const navigate = useNavigate();
  const { id: nominaId } = useParams()
  const { user} = useAuthStore();
  const {
    loadConfiguracionUsuario,
    configuracionNomina,
    calcularNominaCompleta,
    guardarNomina,
    loadingConfiguracion,
    actualizarNomina,
    getNominaById
  } = useNominaStore();

  

  const {
    horasExtra,
    fetchHorasExtra,
    loading: loadingHorasExtra,
    calcularTotalHorasDecimales,
    calcularTotalHorasExtra,
    getEstadisticasPeriodo
  } = useHorasExtraStore();

  const { showSuccess, showError } = useUIStore();
  const [mesNomina, setMesNomina] = useState('');
  const [añoNomina, setAñoNomina] = useState('');
    // State for form fields
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tieneDeduccion, setTieneDeduccion] = useState(false);
  const [deduccionConcepto, setDeduccionConcepto] = useState('');
  const [deduccionCantidad, setDeduccionCantidad] = useState('');
  const [tieneExtra, setTieneExtra] = useState(false);
  const [extraConcepto, setExtraConcepto] = useState('');
  const [extraCantidad, setExtraCantidad] = useState('');
  const [saving, setSaving] = useState(false);
  const [tipoNomina, setTipoNomina] = useState('mensual'); // 'mensual' or 'extra'

  const [nominaCalculada, setNominaCalculada] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // New state to track edit mode
  const [horasExtraPeriodo,setHorasExtraPeriodo]= useState([])

  useEffect(() => {
    if (user?.email) {
      const unsubscribe = loadConfiguracionUsuario(user.email);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user?.email, loadConfiguracionUsuario]);

  useEffect(() => {
       if (nominaId && user?.email && !loadingConfiguracion && configuracionNomina) {
      setIsEditing(true);
      const loadNominaData = async () => {
        const nomina = await getNominaById(nominaId);
         if (nomina) {
          // Set form states with fetched data
          setSelectedDate(dayjs().month(obtenerNumeroMes(nomina.mes)-1).year(nomina.año));
          setFechaInicio(nomina.periodoHorasExtra?.fechaInicio);
          setFechaFin(nomina.periodoHorasExtra?.fechaFin);
          setTipoNomina(nomina.tipo || 'mensual');
          setAñoNomina(nomina.año)
          setMesNomina(nomina.mes)

          if (nomina.deduccion && nomina.deduccion.cantidad > 0) {
            setTieneDeduccion(true);
            setDeduccionConcepto(nomina.deduccion.concepto || '');
            setDeduccionCantidad(nomina.deduccion.cantidad);
          } else {
            setTieneDeduccion(false);
            setDeduccionConcepto('');
            setDeduccionCantidad('');
          }

          if (nomina.extra && nomina.extra.cantidad > 0) {
            setTieneExtra(true);
            setExtraConcepto(nomina.extra.concepto || '');
            setExtraCantidad(nomina.extra.cantidad);
          } else {
            setTieneExtra(false);
            setExtraConcepto('');
            setExtraCantidad('');
          }
          // Fetch horas extra for the specific period of the loaded nomina
          fetchHorasExtra(user.email, nomina.periodoHorasExtra?.fechaInicio, nomina.periodoHorasExtra?.fechaFin);
          
        } else {
          showError('Nómina no encontrada para editar.');
          navigate('/nominas/gestionar'); // Redirect if not found
        }
      };
      loadNominaData();
    } else {
      setIsEditing(false); 
      setDeduccionConcepto('');
      setDeduccionCantidad('');
      setExtraConcepto('');
      setExtraCantidad('');
      setTipoNomina('mensual');
      setFechaInicio(dayjs(selectedDate).startOf('month').subtract(9,'days').format('YYYY-MM-DD'));
      setFechaFin(dayjs(selectedDate).endOf('month').subtract(7,'days').format('YYYY-MM-DD'));
  }
  }, [nominaId, user?.email, getNominaById, navigate, showError,loadingConfiguracion,loadConfiguracionUsuario]);

    useEffect(() => {
      if (!isEditing) {
      setFechaInicio(dayjs(selectedDate).startOf('month').subtract(9,'days').format('YYYY-MM-DD'));
      setFechaFin(dayjs(selectedDate).endOf('month').subtract(7,'days').format('YYYY-MM-DD'));
      setMesNomina(dayjs(selectedDate).locale(es).format('MMMM'))
      setAñoNomina(dayjs(selectedDate).format('YYYY'))}
    }, [selectedDate]); 

    useEffect(() => {
      if (user?.email && fechaInicio && fechaFin) {
        fetchHorasExtra(user.email, fechaInicio, fechaFin);
      }
    }, [user?.email, fechaInicio, fechaFin, fetchHorasExtra]);

    useEffect(() => {
      setHorasExtraPeriodo(horasExtra);
    }, [horasExtra]);

// Recalculate nomina when dependencies change
  useEffect(() => {
    if (configuracionNomina && fechaInicio && fechaFin && !loadingHorasExtra) {
      
      const calculo = calcularNominaCompleta(
        configuracionNomina,
        horasExtraPeriodo,
        tieneExtra? Number(extraCantidad):0, 
        tieneDeduccion?Number(deduccionCantidad):0
      );

      setNominaCalculada({
        empleadoEmail: user.email,
        año: Number(añoNomina),
        mes: capitalizeFirstLetter(mesNomina),
        tipo: "mensual",
        periodoHorasExtra: { fechaInicio, fechaFin },
        sueldoBase: calculo.sueldoBase,
        trienios: calculo.totalTrienios,
        horasExtra: {
          total: calculo.totalHorasExtra,
          desglose: horasExtraPeriodo
        },
        otrosComplementos: calculo.otrosComplementos,
        deduccion: {
          concepto: tieneDeduccion ? deduccionConcepto : 'sin complemento extra',
          cantidad: tieneDeduccion ? Number(deduccionCantidad) : 0,
        },

        extra: {
          concepto: tieneExtra ? extraConcepto : 'sin deducción',
          cantidad: tieneExtra ? Number(extraCantidad) : 0,
        },
          
        total: calculo.totalNomina
     
      });
    } else {
      setNominaCalculada(null);
    }
  }, [configuracionNomina, fechaInicio, fechaFin, horasExtraPeriodo, loadingHorasExtra, tieneDeduccion, deduccionCantidad, tieneExtra, extraCantidad, tipoNomina, selectedDate, calcularNominaCompleta, calcularTotalHorasExtra, getEstadisticasPeriodo]);

  const handleGuardarNomina = async () => {
    if (!nominaCalculada) {
      showError('No hay una nómina calculada para guardar.');
      return;
    }
    if (!user?.email) {
      showError('Usuario no autenticado.');
      return;
    }

    setSaving(true);

    const nominaToSave = {
      ...nominaCalculada,
      empleadoEmail: user.email,
    };

    try {
      let success = false;
      if (isEditing && nominaId) {
        success = await actualizarNomina(nominaId, nominaToSave);
        if (success) {
          showSuccess('Nómina actualizada correctamente.');
        } else {
          showError('Error al actualizar la nómina.');
        }
      } else {
        const newNominaId = await guardarNomina(nominaToSave);
        if (newNominaId) {
          showSuccess('Nómina guardada correctamente.');
        } else {
          showError('Error al guardar la nómina.');
        }
      }
      navigate('/nominas'); // Redirect after save/update
    } catch (error) {
      showError(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFechaChange = (date) => {
    setSelectedDate(date);
  };


  const handleTieneDeduccionChange = (event) => {
    setTieneDeduccion(event.target.checked);
    if (!event.target.checked) {
      setDeduccionConcepto('');
      setDeduccionCantidad('');
    }
  };

  const handleTieneExtraChange = (event) => {
    setTieneExtra(event.target.checked);
    if (!event.target.checked) {
      setExtraConcepto('');
      setExtraCantidad('');
    }
  };

  const totalHorasDecimales = calcularTotalHorasDecimales(horasExtra);
  const totalImporteHorasExtra = calcularTotalHorasExtra(horasExtra);
  const horasTotales = Math.floor(totalHorasDecimales);
  const minutosTotales = Math.round((totalHorasDecimales % 1) * 60);


  const getTipoInfo = (tipo) => {
      return tiposHorasExtra.find(t => t.value === tipo) || { label: tipo, color: '#666' };
    };

  if (loadingConfiguracion) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">Cargando configuración de nómina...</Typography>
      </Container>
    );
  }

  if (!configuracionNomina) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Alert severity="warning">
          No se encontró configuración de nómina para tu usuario. Por favor, configura tus datos de nómina.
        </Alert>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button variant="contained" onClick={() => navigate('/nominas/configurar')} startIcon={<ReceiptIcon />}>
            Ir a Configuración de Nómina
          </Button>
        </Box>
      </Container>
    );

    
  }

  return (
    <>
      {/* AppBar */}
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: isEditing ?
            'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)':
            'linear-gradient(135deg, #FB8C00 0%, #F57C00 50%, #EF6C00 100%)',
          boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => isEditing?
              navigate('/nominas/gestionar'):
              navigate('/nominas')}
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
              sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' }, lineHeight: 1.2 }}
            >
              {isEditing ? "Editar Nómina" : "Generar Nómina"}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ opacity: 0.9, fontSize: { xs: '0.9rem', sm: '1rem' } }}
            >
              {isEditing ? "Modifica los datos" : "Selecciona Mes y Año de la Nómina"}
              
            </Typography>
          </Box>

          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
            <ReceiptIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <Card elevation={5} sx={{ mb: 3, borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 2,  }}>
        <Box sx={{display:'flex', justifyContent:'center', mb:1,  overflow:'hidden'}}>
        <Typography fontWeight="bold" textAlign="center" variant="h5" color={isEditing?"azul.main":"naranja.main"} gutterBottom >
          Mes y Año de la nómina
        </Typography>
        </Box>
        <Box sx={{ display:'flex', justifyContent:'center', mt:1, mx: 'auto' , borderRadius:3}}>
          <MobileDatePicker
            views={['month', 'year']}
            label="Mes y año"
            minDate={dayjs('2010-01-01')}
            maxDate={dayjs().add(2, 'year')}
            value={selectedDate}
            onChange={handleFechaChange}
            inputFormat="MM/YYYY"
            slotProps={{
              textField: {
                fullWidth: true,
                sx: { borderRadius: 3, bgcolor: 'white' }
               },
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9/]*'
              }
            }}
            sx={{
              '& .MuiInputBase-root': { fontSize: '1.2rem', bgcolor: 'white' },
            }}
           
          />
        </Box>
        <Divider sx={{ bgcolor:'black', mt:4 }} />

            {/* --- Paso 1: SelectorPeriodo --- */}
                        <Box sx={{display:'flex', flexDirection:"column", justifyContent:'center',mt:3, mb:2}}>
                        <Typography fontWeight="bold" textAlign="center" variant="h5" color={isEditing?"azul.main":"naranja.main"}  >
                          Período de horas extras
                        </Typography>
                        <Typography  textAlign="center" variant="body1" gutterBottom>
                          Horas Extras a incluir en la nómina
                        </Typography>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                              type="date"
                              label="Fecha de inicio"
                              value={fechaInicio}
                              onChange={(e)=>setFechaInicio(e.target.value)}
                              fullWidth
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing ? "azul.main":"naranja.main"
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  }
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                  color: isEditing?"azul.main":"naranja.main",   
                                }
                              }}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                              type="date"
                              label="Fecha de fin"
                              value={fechaFin}
                              onChange={(e)=>setFechaFin(e.target.value)}
                              fullWidth
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  }
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                  color: isEditing?"azul.main":"naranja.main"
                                }
                              }}
                            />
                          </Grid>
                        </Grid>
                        {loadingHorasExtra ? (
                          <Box textAlign="center" p={4}>
                            <CircularProgress />
                            <Typography>Cargando registros...</Typography>
                          </Box>
                        ) : horasExtra.length === 0 ? (
                          <Alert sx={{mb:-1,mt:2}} severity="info">
                            {!fechaInicio || !fechaFin  ? 
                              'Selecciona un período para ver los registros' :
                              'No hay horas extra en este período'
                            }
                          </Alert>
                        ) : (
                          <Box mt={3}>
                            <Typography variant="h6" textAlign="center" color={isEditing?"azul.main":"naranja.main"} fontWeight="bold" gutterBottom>
                              Horas Extras del Mes
                            </Typography>
                            {/* Header de tabla */}
                            <Box display="flex" p={1} fontWeight="bold" bgcolor={isEditing?"azul.fondo":"naranja.fondo"} borderRadius={2}>
                              <Typography sx={{ flex: 'none', width: '30%', textAlign: 'center', fontWeight:'bold' }}>Fecha</Typography>
                              <Typography sx={{ flex: `none`, width: '20%', textAlign: 'center', fontWeight:'bold'}}>Tipo</Typography>
                              <Typography sx={{ flex: 'none', width: '25%', textAlign: 'center', fontWeight:'bold' }}>Tiempo</Typography>
                              <Typography sx={{ flex: 'none', width: '25%', textAlign: 'center', fontWeight:'bold' }}>€€</Typography>
                            </Box>
            
                            {/* Filas de datos */}
                            {horasExtra.map((hora) => {

                              const tipoInfo = getTipoInfo(hora.tipo);
                              return (
                                <Box key={hora.id} display="flex" alignItems="center" p={1} borderBottom="1px solid" borderColor="grey.200">
                                  <Typography sx={{ width: '30%', textAlign:'left', fontSize:'1rem', flex: 'none' }}>
                                    {formatDate(hora.fecha)}
                                  </Typography>
                                   <Typography sx={{ width: '20%', textAlign:'center', fontSize:'1rem', flex: 'none' }}>
                                    {tipoInfo.short}
                                  </Typography>                      
                                  <Typography sx={{ width: '25%', textAlign:'center', fontSize:'1rem', flex: 'none' }}>
                                    {formatearTiempo(hora.horas || 0, hora.minutos || 0)}
                                  </Typography>
                                   <Typography sx={{ width: '25%', textAlign:'right', fontSize:'1rem', flex: 'none' }}>
                                    {formatCurrency(hora.importe)}
                                  </Typography>                              
                                </Box>
                              );
                                })}
                                <Box                         
                                  display="flex" 
                                  alignItems="center" 
                                  py={1}
                                  borderTop="2px solid" 
                                  borderColor="grey.400"
                                  bgcolor={isEditing?"azul.fondo":"naranja.fondo"}
                                 > 
                                  <Typography sx={{ width: '30%', textAlign:'center', fontSize:'1rem', flex: 'none', fontWeight:'bold' }}>
                                    TOTAL
                                  </Typography>
                                   <Typography sx={{ pl:2, width: '35%', textAlign:'center', fontSize:'1rem', flex: 'none',fontWeight: 'bold' }}>
                                    {formatearTiempo(horasTotales, minutosTotales)}
                                  </Typography>                      
                                   <Typography sx={{ pr:1, width: '35%', textAlign:'right', fontSize:'1rem', flex: 'none',fontWeight: 'bold' }}>
                                    {formatCurrency(totalImporteHorasExtra)}
                                  </Typography>                              
                                </Box>
                          </Box>
                        )}

                        <Divider sx={{ bgcolor:'black', mt:4 }} />
                        <Box sx={{display:'flex', justifyContent:'center', gap:4, alignItems:'center', mt:3,}}>
                        <Typography  variant="h6"  color={isEditing?"azul.main":"naranja.main"} fontWeight="bold">
                          Complemento Extra
                        </Typography>
                        
                        <FormControlLabel
                          control={
                            <Switch
                              checked={tieneExtra}
                              onChange={handleTieneExtraChange}
                                sx={{ 
                                '& .MuiSwitch-switchBase': {
                                color: 'grey.400',
                                '&.Mui-checked': {
                                  color: isEditing?"azul.main":"naranja.main", 
                                },
                              },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: isEditing?"azul.main":"naranja.main" }
                              }}
                            />
                          }
                          label={''}
                          sx={{ mb: tieneExtra? '2': '0', display: 'flex'}}
                        />
                        </Box>
                        <Box sx={{display:'flex', flexDirection:'column', p:2, mt:-1}}>
                          <Typography variant="body1" fontWeight={600} textAlign={'center'}>
                            {tieneExtra ? 'Tengo un pago Extra este mes' : 'No tengo un pago Extra este mes'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" textAlign={'center'}>
                            {tieneExtra && 'Se añadirá al total de la nómina. Por ej. si tenias atrasos pendientes'}
                          </Typography>
                        </Box>
                        {tieneExtra && (
                          <Box>
                            <TextField
                              label="Concepto"
                              placeholder="Faltante del mes pasado"
                              value={extraConcepto}
                              onChange={(e)=>{setExtraConcepto(e.target.value)}}
                              fullWidth
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  }
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                  color: isEditing?"azul.main":"naranja.main"
                                }
                              }}
                            />              
                            <TextField
                              type="number"
                              label="Pago Extra (€)"
                              value={extraCantidad}
                              onChange={(e)=>{setExtraCantidad(e.target.value)}}
                              fullWidth
                              slotProps={{ 
                                htmlInput:{
                                  min: 0 
                                  }
                                }}
                               sx={{
                                mt:2,
                                '& .MuiOutlinedInput-root': {
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  }
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                  color: isEditing?"azul.main":"naranja.main"
                                }
                              }}
                            />
                            </Box>
                            )}

                        <Divider sx={{ bgcolor:'black', mt:4 }} />
                        <Box sx={{display:'flex', justifyContent:'center', gap:4, alignItems:'center', mt:3,}}>
                        <Typography  variant="h6"  color={isEditing?"azul.main":"naranja.main"} fontWeight="bold">
                          Deducciones
                        </Typography>
                        
                        <FormControlLabel
                          control={
                            <Switch
                              checked={tieneDeduccion}
                              onChange={handleTieneDeduccionChange}
                                sx={{ 
                                '& .MuiSwitch-switchBase': {
                                color: 'grey.400',
                                '&.Mui-checked': {
                                  color: isEditing?"azul.main":"naranja.main", 
                                },
                              },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: isEditing?"azul.main":"naranja.main" }
                              }}
                            />
                          }
                          label={''}
                          sx={{ mb: tieneDeduccion? '2': '0', display: 'flex'}}
                        />
                        </Box>
                        <Box sx={{display:'flex', flexDirection:'column', p:2, mt:-1}}>
                          <Typography variant="body1" fontWeight={600} textAlign={'center'}>
                            {tieneDeduccion? 'Tengo una deduccion' : 'No tengo deducción'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" textAlign={'center'}>
                            {tieneDeduccion && 'La deducción se restará al total de la nómina. Por ej. si has estado de baja.'}
                          </Typography>
                        </Box>
                        {tieneDeduccion && (
                          <Box>
                            <TextField
                              label="Concepto"
                              placeholder="Baja médica"
                              value={deduccionConcepto}
                              onChange={(e)=>{setDeduccionConcepto(e.target.value)}}
                              fullWidth
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  }
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                  color: isEditing?"azul.main":"naranja.main"
                                }
                              }}
                            />              
                            <TextField
                              type="number"
                              label="Deducción (€)"
                              value={deduccionCantidad}
                              onChange={(e)=>{setDeduccionCantidad(e.target.value)}}
                              fullWidth
                              slotProps={{ 
                                htmlInput:{
                                  min: 0 
                                  }
                                }}
                               sx={{
                                mt:2,
                                '& .MuiOutlinedInput-root': {
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isEditing?"azul.main":"naranja.main"
                                  }
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                  color: isEditing?"azul.main":"naranja.main"
                                }
                              }}
                            />
                            </Box>
                            )}
                      </CardContent>
                    </Card>
            {/* --- Paso 3: VistaPrevia --- */}
            <Card elevation={5} sx={{ borderRadius: 4, border: 'px solid rgba(0,0,0,0.08)', mt:4 }}>
              <CardContent>
                {selectedDate && (
            <Typography textAlign="center" variant="h6" fontSize="1.2rem" fontWeight="bold" color={isEditing?"azul.main":"naranja.main"}>
              Nómina de {capitalizeFirstLetter(dayjs(selectedDate).locale(es).format('MMMM'))} de {dayjs(selectedDate).format('YYYY')}
            </Typography>
            )}

            {loadingConfiguracion ? (
              <Box textAlign="center" py={3} sx={{mt:1}}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Calculando nómina...</Typography>
              </Box>
            ) : nominaCalculada ? (
              <Box  py={3} sx={{mt:-1 }}>
                    <Box display="flex" justifyContent="space-between" p={1}>
                    <Typography><strong>Sueldo base:</strong></Typography> <Typography>{formatCurrency(nominaCalculada.sueldoBase)}</Typography>
                    </Box>
                    {nominaCalculada.totalTrienios > 0 && (
                      <>
                    <Divider />
                    <Box display="flex" justifyContent="space-between" p={1}>
                    <Typography><strong>Trienios:</strong></Typography>
                     <Typography>{formatCurrency(nominaCalculada.totalTrienios)}</Typography>
                    </Box>
                      </>
                    )}
                    {nominaCalculada.otrosComplementos && nominaCalculada.otrosComplementos.length > 0 && (
                      nominaCalculada.otrosComplementos.map((comp, idx) => (
                        <>
                        <Divider />
                        <Box display="flex" justifyContent="space-between" p={1} key={idx}>
                        <Typography key={idx}>
                          <strong>{comp.concepto}:</strong>
                        </Typography>
                        <Typography>{formatCurrency(comp.importe)}</Typography>
                        </Box>
                        </>
                      ))
                    )}
                    <Divider />
                    <Box display="flex" justifyContent="space-between" p={1}>  
                    <Typography><strong>Horas extra:</strong> </Typography>
                    <Typography>{formatCurrency(nominaCalculada.horasExtra.total)}</Typography>
                    </Box>
                    {tieneExtra && (
                      <>
                    <Divider />
                    <Box display="flex" justifyContent="space-between" p={1}>
                      <Box display="flex" flexDirection="column">
                    <Typography><strong>Complemento Extra:</strong></Typography>
                    <Typography color="textSecondary" variant='body2'><strong>{extraConcepto}</strong></Typography>
                    </Box>
                    <Box display="flex" flexDirection="column" justifyContent={'center'}>
                     <Typography >{formatCurrency(nominaCalculada.extra.cantidad)}</Typography>
                     </Box>
                    </Box>
                      </>
                    )}                    
                    {tieneDeduccion && (
                      <>
                    <Divider />
                    <Box display="flex" justifyContent="space-between" p={1}>
                      <Box display="flex" flexDirection="column">
                    <Typography><strong>Deducción:</strong></Typography>
                    <Typography color="textSecondary" variant='body2'><strong>{deduccionConcepto}</strong></Typography>
                    </Box>
                    <Box display="flex" flexDirection="column" justifyContent={'center'}>
                     <Typography color='rojo.main'>{formatCurrency(-nominaCalculada.deduccion.cantidad)}</Typography>
                     </Box>
                    </Box>
                      </>
                    )}
                    
                    <Box 
                      borderTop="2px solid" 
                      borderColor="grey.400"
                      bgcolor={isEditing?"azul.fondo":"naranja.fondo"} 
                      display="flex" 
                      justifyContent="space-between" 
                      p={1}
                    >
                    <Typography   fontWeight="bold" >
                      TOTAL: 
                    </Typography>
                    <Typography  fontWeight="bold" >
                      {formatCurrency(nominaCalculada.total)}
                    </Typography>
                    </Box>  

                <Box textAlign="center" sx={{ mt: 4, mb:-3 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  color="warning"
                  onClick={handleGuardarNomina}
                  disabled={saving}
                  sx={{
                      py: 2,
                      borderRadius: 3,
                      background: isEditing ? 
                        'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)':
                        'linear-gradient(135deg, #FB8C00 0%, #F57C00 100%)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 4px 15px rgba(255, 165, 0, 0.3)',
                      '&:hover': {
                        background: isEditing ?
                        'linear-gradient(135deg, #1976D2 0%, #2196F3 100%)':
                        'linear-gradient(135deg, #F57C00 0%, #FB8C00 100%)',
                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                        transform: 'translateY(-2px)'
                      },
                      '&:disabled': {
                        background: isEditing ?
                        'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)':
                        'linear-gradient(135deg, #FFDAB9 0%, #FFC19A 100%)',
                      },
                      transition: 'all 0.3s ease'                    
                  }}
                >
                  {saving ? "Guardando..." :  (isEditing ? "Actualizar Nómina" : "Guardar Nómina")}
                </Button>
                </Box>
              </Box>
              ) : (
            <Alert severity="info" sx={{ mt: 3 }}>
              Selecciona un periodo para calcular tu nómina.
            </Alert>
                      )}
              </CardContent>
            </Card>
        </LocalizationProvider >
      </Container>
    </>
  );
};

export default GenerarNomina;
