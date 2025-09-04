import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar, FormControl, FormControlLabel,
  Switch, IconButton, Button, Grid, TextField, Divider, Alert, CircularProgress, FormLabel,
  RadioGroup, Radio, MenuItem,
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  Receipt as ReceiptIcon,
  Save as SaveIcon,
  CalendarMonth as CalendarMonthIcon,
  AccessTime as TimeIcon,
  Wysiwyg as WysiwygIcon,
  PostAddOutlined as AddIcon , 
  EditOutlined as EditIcon
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
  const { user, userProfile } = useAuthStore();
  const {
    loadConfiguracionUsuario,
    configuracionNomina,
    calcularNominaCompleta,
    guardarNomina,
    loadingConfiguracion,
    actualizarNomina,
    getNominaById,
    calcularAñosServicio,
    checkDuplicateNomina
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
  const [añoNomina, setAñoNomina] = useState(new Date().getFullYear());
    // State for form fields
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tieneDeduccion, setTieneDeduccion] = useState(false);
  const [deduccionConcepto, setDeduccionConcepto] = useState('');
  const [deduccionCantidad, setDeduccionCantidad] = useState(0);
  const [tieneExtra, setTieneExtra] = useState(false);
  const [extraConcepto, setExtraConcepto] = useState('');
  const [extraCantidad, setExtraCantidad] = useState(0);
  const [saving, setSaving] = useState(false);
  const [tipoNomina, setTipoNomina] = useState('mensual'); 
  const [numeroTrienios, setNumeroTrienios] = useState(0);


  const [tipoPaga, setTipoPaga] = useState('verano');
  const [importe, setImporte] = useState(0);

  const [nominaCalculada, setNominaCalculada] = useState(null);
  const [isEditing, setIsEditing] = useState(false); 
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
    if (configuracionNomina?.pagaExtra) {
      setImporte(configuracionNomina.pagaExtra);
    }
  }, [configuracionNomina]);

  useEffect(() => {
       if (nominaId && user?.email && !loadingConfiguracion && configuracionNomina) {
      setIsEditing(true);
      const loadNominaData = async () => {
        const nomina = await getNominaById(nominaId);
         if (nomina) {
          setSelectedDate(dayjs().month(obtenerNumeroMes(nomina.mes)-1).year(nomina.año));
          setFechaInicio(nomina.periodoHorasExtra?.fechaInicio);
          setFechaFin(nomina.periodoHorasExtra?.fechaFin);
          setNumeroTrienios(Math.floor(nomina.trienios/configuracionNomina.valorTrienio));
          setTipoNomina(nomina.tipo);
          setAñoNomina(nomina.año)
          setMesNomina(nomina.mes)
          setTipoPaga(nomina.mes==='P.E. Verano'?"verano" : 'navidad')
          setImporte(nomina.total)

          if (nomina.deduccion && nomina.deduccion.cantidad > 0) {
            setTieneDeduccion(true);
            setDeduccionConcepto(nomina.deduccion.concepto);
            setDeduccionCantidad(nomina.deduccion.cantidad);
          } else {
            setTieneDeduccion(false);
            setDeduccionConcepto('');
            setDeduccionCantidad(0);
          }

          if (nomina.extra && nomina.extra.cantidad > 0) {
            setTieneExtra(true);
            setExtraConcepto(nomina.extra.concepto || '');
            setExtraCantidad(nomina.extra.cantidad);
          } else {
            setTieneExtra(false);
            setExtraConcepto('');
            setExtraCantidad(0);
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
      setDeduccionCantidad(0);
      setExtraConcepto('');
      setExtraCantidad(0);
      setTipoNomina('mensual');
      setFechaInicio(dayjs(selectedDate).startOf('month').subtract(9,'days').format('YYYY-MM-DD'));
      setFechaFin(dayjs(selectedDate).endOf('month').subtract(7,'days').format('YYYY-MM-DD'));
  }
  }, [nominaId, user?.email, getNominaById, navigate,loadingConfiguracion,loadConfiguracionUsuario]);

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

    useEffect(() => {
      if (configuracionNomina?.tieneTrienios && userProfile?.fechaIngreso) {
        try {
          const fechaNomina = dayjs(selectedDate).startOf('month').format('YYYY-MM-DD');
          const añosServicio = calcularAñosServicio(userProfile?.fechaIngreso, fechaNomina);
          const trieniosAutomaticos = Math.floor(añosServicio / 3);
          setNumeroTrienios(trieniosAutomaticos);
        } catch (error) {
          console.error('Error calculando trienios:', error);
          setNumeroTrienios(0);
        }
      }
}, [configuracionNomina, user?.fechaIngreso, selectedDate]);

  useEffect(() => {
    if (configuracionNomina && fechaInicio && fechaFin && !loadingHorasExtra) {
      
      const calculo = calcularNominaCompleta(
        configuracionNomina,
        numeroTrienios,
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
          concepto: tieneDeduccion ? deduccionConcepto : 'sin deducción',
          cantidad: tieneDeduccion ? Number(deduccionCantidad) : 0,
        },

        extra: {
          concepto: tieneExtra ? extraConcepto : 'sin complemento extra',
          cantidad: tieneExtra ? Number(extraCantidad) : 0,
        },
          
        total: calculo.totalNomina
     
      });
    } else {
      setNominaCalculada(null);
    }
  }, [configuracionNomina, fechaInicio, fechaFin, horasExtraPeriodo, loadingHorasExtra, tieneDeduccion, deduccionCantidad, tieneExtra, extraCantidad, tipoNomina, selectedDate, calcularNominaCompleta, calcularTotalHorasExtra, getEstadisticasPeriodo, numeroTrienios]);

  // Guardar paga extra
  const handleGuardar = async () => {
    if (!importe || isNaN(importe) || Number(importe) <= 0) {
      showError('El importe debe ser mayor que 0');
      return;
    }
    setSaving(true);

    

    const nominaToSave = {
        empleadoEmail: user.email,
        año: Number(añoNomina),
        mes: tipoPaga === 'verano' ? 'P.E. Verano' : 'P.E. Navidad',
        tipo: "paga extra",
        importePagaExtra: Number(configuracionNomina.pagaExtra),
        sueldoBase: 0,
        trienios: 0,
        otrosComplementos: [],
        horasExtra: { total: 0, desglose: [] },
        deduccion: {
          concepto: deduccionConcepto,
          cantidad:  Number(deduccionCantidad),
        },
  
        extra: {
          concepto: 'sin complemento extra',
          cantidad: 0,
        },
        total: Number(importe-deduccionCantidad)
      };

    try {

      let success = false;
      if (isEditing && nominaId) {
        success = await actualizarNomina(nominaId, nominaToSave);
        if (success) {
          showSuccess('Paga Extra actualizada correctamente.');
          navigate('/nominas/gestionar');
        } else {
          showError('Error al actualizar la Paga Extra.');
        }
      } else {
        const duplicateCheck = await checkDuplicateNomina(user.email, nominaToSave.mes, nominaToSave.año, nominaToSave.tipo, nominaToSave.mes);
          if (duplicateCheck.exists) {
          showError(duplicateCheck.message);
          setSaving(false);
          return;
        }
        const newNominaId = await guardarNomina(nominaToSave);
        if (newNominaId) {
          showSuccess('Paga Extra guardada correctamente.');
          navigate('/nominas'); 
        } else {
          showError('Error al guardar Paga Extra.');
        }
      }

    } catch (error) {
      showError(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }; 
 
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
          navigate('/nominas/gestionar');
        } else {
          showError('Error al actualizar la nómina.');
        }
      } else {
        const duplicateCheck = await checkDuplicateNomina(user.email, nominaToSave.mes, nominaToSave.año, nominaToSave.tipo, nominaToSave.mes);
        if (duplicateCheck.exists) {
          showError(duplicateCheck.message);
          setSaving(false);
          return;
        }

        const newNominaId = await guardarNomina(nominaToSave);
        if (newNominaId) {
          showSuccess('Nómina guardada correctamente.');
          navigate('/nominas');
        } else {
          showError('Error al guardar la nómina.');
        }
      }
    } catch (error) {
      showError(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };


  const añosDisponibles = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

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
              {isEditing ? "Modifica los datos" : "Rellena los datos de la Nómina"}
              
            </Typography>
          </Box>

          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default',
            }}
          >
            {isEditing?<EditIcon sx={{fontSize:'2rem'}}/> : <AddIcon sx={{fontSize:'2rem'}}/>}
          </IconButton>
        </Toolbar>
      </AppBar>

            <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
                    <Card elevation={5} sx={{ mb: 3, borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
                      <CardContent sx={{ p: 2,  }}>
                          <FormControl component="fieldset" sx={{ width: '100%', my: 2 }}>
                            <FormLabel component="legend"  sx={{ textAlign:'center' }}>
                              <Typography fontWeight="bold" textAlign="center" variant="h5" color={isEditing?"azul.main":"naranja.main"} >
                                Tipo de Nómina
                              </Typography>
                            </FormLabel>
                            <RadioGroup
                              row
                              aria-label="tipo de nómina"
                              name="tipoNomina"
                              value={tipoNomina}
                              onChange={(e)=>setTipoNomina(e.target.value)}
                              sx={{
                                justifyContent:'center',
                                gap: { xs: 2, sm: 4 },
                                flexWrap: 'wrap'
                              }}
                            >
                              <FormControlLabel
                                value="mensual"
                                control={<Radio sx={{color: isEditing? 'azul,main':'naranja.main', '&.Mui-checked': { color: isEditing? 'azul,main':'naranja.main' }}}/>}
                                label="Mensual"
                                sx={{ mr: 2 }}
                              />
                              <FormControlLabel
                                value="paga extra"
                                control={<Radio sx={{color: isEditing? 'azul,main':'naranja.main', '&.Mui-checked': { color: isEditing? 'azul,main':'naranja.main' }}} />}
                                label="Paga Extra"
                                />
                            </RadioGroup>
                          </FormControl>
                          <Divider sx={{ bgcolor:'black', mb:3 }} />
                                        
                          
                        {tipoNomina==="mensual" ? (
                          <>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
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
                        </LocalizationProvider >
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
                              'No tienes horas extra en este período'
                            }
                          </Alert>
                        ) : (
                          <Box mt={3}>
                            <Typography variant="h5" textAlign="center" color={isEditing?"azul.main":"naranja.main"} fontWeight="bold" gutterBottom>
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

                        {/* Trienios Dinámicos */}
                        {configuracionNomina?.tieneTrienios && (
                            <Box sx={{display:'flex', flexDirection:'column',  mt:2}}>
                              <Typography textAlign="center" variant="h5" color={isEditing?"azul.main":"naranja.main"} fontWeight="bold">
                                Trienios
                              </Typography>
                              {!userProfile?.fechaIngreso && (
                              <Alert severity="error" sx={{ mb: 2 }}>
                                <Typography textAlign="center" variant='body2'>
                                  Configura en tu perfil, la fecha de ingreso en la empresa para calcular automaticamente tus trienios
                                </Typography>
                              </Alert>
                              )}

                              <Box sx={{display:'flex', justifyContent:'center', gap:4, alignItems:'center', p:2, mt:1,}}>
                                <TextField
                                  label="Cantidad Trienios"
                                  type="number"
                                  value={numeroTrienios}
                                  onChange={(e) => setNumeroTrienios(parseInt(e.target.value) || 0)}
                                  fullWidth

                                  sx={{
                                    '& .MuiInputLabel-root': {
                                      color: 'black',
                                    },
                                    '& .MuiOutlinedInput-root': {
                                      
                                      '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: isEditing ? "azul.main" : "naranja.main"
                                      },
                                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: isEditing ? "azul.main" : "naranja.main"
                                      },
                                      '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                                        borderColor: isEditing ? "azul.main" : "naranja.main"
                                      }
                                    },
                                  '& .MuiInputLabel-root.Mui-focused': {
                                    color: isEditing?"azul.main":"naranja.main"
                                  }
                                  }}
                                />
                                 <TextField
                                  label="Precio Trienio"
                                  type="string"
                                  value={formatCurrency(configuracionNomina.valorTrienio)}
                                  disabled
                                  variant="outlined" 
                                  sx={{
                                    bgcolor:'rgba(0,0,0,0.08)',
                                    // Estilos para el borde cuando el TextField está deshabilitado (variante outlined)
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      borderColor: 'black !important', // Borde negro
                                    },
                                    // Estilos para el texto de entrada cuando el TextField está deshabilitado
                                    '& .MuiInputBase-input.Mui-disabled': {
                                      textAlign: 'center',
                                      color: 'black !important', // Color del texto negro
                                      // Esto es crucial para navegadores basados en WebKit (Chrome, Safari)
                                      // que pueden tener un estilo de texto gris predeterminado para inputs deshabilitados
                                      WebkitTextFillColor: 'black !important', 
                                    },
                                    '& .MuiInputBase-input': {
                                      textAlign: 'center', // Centra el texto horizontalmente
                                      color: 'black !important', // Asegura que el texto siga siendo negro
                                      WebkitTextFillColor: 'black !important', // Crucial para navegadores WebKit
                                    },
                                    // Estilos para la etiqueta (label) cuando el TextField está deshabilitado
                                    '& .MuiInputLabel-root.Mui-disabled': {
                                      textAlign: 'center',
                                      color: 'black !important', // Color de la etiqueta negro
                                    },

                                    // Si usas la variante 'filled' o 'standard', también querrás esto para el underline
                                     '& .MuiFilledInput-underline:before': { // Para 'filled'
                                       borderBottomColor: 'black !important',
                                     },
                                     '& .MuiInput-underline:before': { // Para 'standard'
                                       borderBottomColor: 'black !important',
                                     },
                                  }}
                                />
                            </Box>
                            <Divider sx={{ bgcolor:'black', mt:3}} />
                            </Box>
                        )}





                        <Box sx={{display:'flex', justifyContent:'center', gap:4, alignItems:'center', mt:3,}}>
                        <Typography  variant="h5"  color={isEditing?"azul.main":"naranja.main"} fontWeight="bold">
                          Pago Extra
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
                        <Typography  variant="h5"  color={isEditing?"azul.main":"naranja.main"} fontWeight="bold">
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
</>
                        ):(
                          
                          <Box>
                              <Typography textAlign="center" variant="h5" color={isEditing? 'azul,main':'naranja.main'} fontWeight="600" gutterBottom>
                                Tipo de paga extra
                              </Typography>
                              <RadioGroup
                                row
                                value={tipoPaga}
                                onChange={e => setTipoPaga(e.target.value)}
                                sx={{ mb: 3, justifyContent:'center' }}
                              >
                                <FormControlLabel
                                  value="verano"
                                  control={<Radio sx={{ color: isEditing? 'azul,main':'naranja.main', '&.Mui-checked': { color: isEditing? 'azul,main':'naranja.main' } }} />}
                                  label="Verano"
                                />
                                <FormControlLabel
                                  value="navidad"
                                  control={<Radio sx={{ color: isEditing? 'azul,main':'naranja.main', '&.Mui-checked': { color: isEditing? 'azul,main':'naranja.main' } }} />}
                                  label="Navidad"
                                />
                              </RadioGroup>
                              <TextField
                                select
                                label="Año"
                                value={añoNomina}
                                onChange={e => setAñoNomina(e.target.value)}
                                fullWidth
                                sx={{ mb: 3,
                                  '& .MuiOutlinedInput-root': {
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                      borderColor: isEditing? 'azul,main':'naranja.main'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                      borderColor: isEditing? 'azul,main':'naranja.main'
                                    }
                                  },
                                  '& .MuiInputLabel-root.Mui-focused': {
                                    color: isEditing? 'azul,main':'naranja.main'
                                  }
                                 }}
                              >
                                {añosDisponibles.map(a => (
                                  <MenuItem key={a} value={a}>{a}</MenuItem>
                                ))}
                              </TextField>
                              <TextField
                                type="number"
                                label="Importe paga extra (€)"
                                value={importe}
                                onChange={(e) => setImporte(e.target.value)}
                                fullWidth
                                slotProps={{ 
                                  htmlInput:{
                                      min: 0, step: 0.01 
                                    }
                                  }}
                                sx={{
                                  
                                  '& .MuiOutlinedInput-root': {
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                      borderColor: isEditing? 'azul,main':'naranja.main'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                      borderColor: isEditing? 'azul,main':'naranja.main'
                                    }
                                  },
                                  '& .MuiInputLabel-root.Mui-focused': {
                                    color: isEditing? 'azul,main':'naranja.main'
                                  }
                                }}
                              />

                        <Box sx={{display:'flex', justifyContent:'center', gap:4, alignItems:'center', mt:2,}}>
                        <Typography  variant="h5"  color={isEditing?"azul.main":"naranja.main"} fontWeight="bold">
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
                            {tieneDeduccion && 'La deducción se restará al total de la paga Extra. Por ej. si has estado de baja.'}
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
                                mb:4,
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

                          
                          </Box>
                          )}
                      </CardContent>
                    </Card>
                    
            {/* --- Paso 3: VistaPrevia --- */}


              {tipoNomina==="mensual" ? (
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
                    {nominaCalculada.trienios > 0 && (
                      <>
                    <Divider />
                    <Box display="flex" justifyContent="space-between" p={1}>
                      <Box display="flex" flexDirection="column">
                        <Typography><strong>Trienios:</strong></Typography>
                        <Typography variant='body2' textAlign='center'>{numeroTrienios} x {configuracionNomina.valorTrienio}€</Typography>
                      </Box>
                      <Box display="flex" flexDirection="column" justifyContent={'center'}>
                        <Typography>{formatCurrency(nominaCalculada.trienios)}</Typography>
                      </Box>
                    </Box>
                      </>
                    )}
                    {nominaCalculada.otrosComplementos && nominaCalculada.otrosComplementos.length > 0 && (
                      nominaCalculada.otrosComplementos.map((comp, idx) => (
                        <Box key={idx}>
                        <Divider />
                        <Box display="flex" justifyContent="space-between" p={1} >
                        <Typography key={idx}>
                          <strong>{comp.concepto}:</strong>
                        </Typography>
                        <Typography>{formatCurrency(comp.importe)}</Typography>
                        </Box>
                        </Box>
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
                    <Typography variant='body2'> {deduccionConcepto}</Typography>
                    </Box>
                    <Box display="flex" flexDirection="column" justifyContent={'center'}>
                     <Typography color='rojo.main'>{formatCurrency(-nominaCalculada.deduccion.cantidad)}</Typography>
                     </Box>
                    </Box>
                      </>
                    )}
                    
                    <Box 
                      borderTop="2px solid" 
                      borderColor="black"
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
                      ):(
            <Card elevation={5} sx={{ borderRadius: 4, border: 'px solid rgba(0,0,0,0.08)', mt:4 }}>
              <CardContent>
                <Typography style={{mt:1}}  textAlign="center" variant="h6" fontSize="1.3rem" fontWeight="bold" color={isEditing?"azul.main":"naranja.main"}>
                 Paga Extra de {capitalizeFirstLetter(tipoPaga)}
                </Typography>
                <Box  py={3} sx={{mt:-1 }}>
                    <Box display="flex" justifyContent="space-between" p={1}>
                    <Typography><strong>Base Paga Extra:</strong></Typography> <Typography>{formatCurrency(importe)}</Typography>
                    </Box>
                    

                    <Divider />
                    {tieneDeduccion && (
                      <>
                    <Divider />
                    <Box display="flex" justifyContent="space-between" p={1}>
                      <Box display="flex" flexDirection="column">
                    <Typography><strong>Deducción:</strong></Typography>
                    <Typography color="textSecondary" variant='body2'><strong>{deduccionConcepto}</strong></Typography>
                    </Box>
                    <Box display="flex" flexDirection="column" justifyContent={'center'}>
                     <Typography color='rojo.main'>{formatCurrency(-deduccionCantidad)}</Typography>
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
                      {formatCurrency(importe-Number(deduccionCantidad))}
                    </Typography>
                    </Box>  
                    </Box>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleGuardar}
                    disabled={saving}
                    fullWidth
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
                    {saving ? "Guardando..." :  (isEditing ? "Actualizar Paga Extra" : "Guardar Paga Extra")}
                  </Button>
              </CardContent>
              </Card>
                      )}        
      </Container>
    </>
  );
};

export default GenerarNomina;
