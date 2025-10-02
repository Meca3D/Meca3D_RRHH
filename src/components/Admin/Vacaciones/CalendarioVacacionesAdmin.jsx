
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, FormControl, InputLabel, Select, MenuItem,
  Grid, Alert, Chip, Avatar, AvatarGroup, Tooltip, Paper, Divider,
  ButtonGroup, CircularProgress, Badge, LinearProgress
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  CalendarMonth as CalendarMonthIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Groups as GroupsIcon,
  Today as TodayIcon,
  ViewModule as ViewModuleIcon,
  CalendarViewMonth as CalendarViewMonthIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useUIStore } from '../../../stores/uiStore';
import { formatearNombre } from '../../Helpers';
import { formatearFechaCorta, formatYMD, obtenerDiasCalendario, navegarMes, formatearMesAno, esFinDeSemana, formatearFechaLarga } from '../../../utils/dateUtils';
import { formatearTiempoVacas } from '../../../utils/vacacionesUtils';

const CalendarioVacacionesAdmin = () => {
  const navigate = useNavigate();
  const { 
    loadConfigVacaciones,
    configVacaciones,
    loadFestivos,
    loadVacacionesAprobadasConCancelaciones,
    calcularDisponibilidadPorFecha,
    detectarConflictos,
    obtenerEmpleadosConSolicitudes,
    obtenerPuestosConSolicitudes,
    obtenerDatosUsuarios,
    esFestivo,
  } = useVacacionesStore();
  const { showError, showInfo } = useUIStore();

  // Estados principales
  const [mesActual, setMesActual] = useState(new Date());
  const [vistaActual, setVistaActual] = useState('mensual'); // mensual, anual
  const [vacacionesAprobadas, setVacacionesAprobadas] = useState([]);
  const [proximasVacaciones, setProximasVacaciones] = useState([]);
  const [datosUsuarios, setDatosUsuarios] = useState({});
  const [conflictosPorFecha, setConflictosPorFecha] = useState({}); //  almacenar conflictos detectados
  
  // Estados de filtros
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroPuesto, setFiltroPuesto] = useState('Todos');

  // Estados de datos
  const [loading, setLoading] = useState(false); //  loading general
  const [loadingConflictos, setLoadingConflictos] = useState(false);

  const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // ✅ useEffect 1: Carga inicial de datos CON cleanup
  useEffect(() => {
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const año = mesActual.getFullYear();
      const unsubscribeConfig = loadConfigVacaciones()
      // ✅ Cargar festivos
      const unsubscribeFestivos = loadFestivos(año);
      
      // ✅ Cargar vacaciones aprobadas directamente desde Firestore
      const vacaciones = await loadVacacionesAprobadasConCancelaciones(año);
      setVacacionesAprobadas(vacaciones);
      
      // Cargar próximas vacaciones usando la nueva función
      const proximas = vacaciones.filter(solicitud => {
        const hoy = new Date();
        const dentro30Dias = new Date();
        dentro30Dias.setDate(hoy.getDate() + 30);
        const fechaInicio = new Date(solicitud.fechas[0]);
        return fechaInicio >= hoy && fechaInicio <= dentro30Dias;
      }).slice(0, 8);
      
      setProximasVacaciones(proximas);
      
      // Si hay datos, cargar información de usuarios
      if (vacaciones.length > 0 || proximas.length > 0) {
        const emails = [...new Set([
          ...vacaciones.map(v => v.solicitante),
          ...proximas.map(v => v.solicitante)
        ])];
        
        if (emails.length > 0) {
          const usuarios = await obtenerDatosUsuarios(emails);
          setDatosUsuarios(usuarios);
        }
      }
      
    } catch (error) {
      showError(`Error cargando datos del calendario: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  cargarDatos();
}, [mesActual, loadVacacionesAprobadasConCancelaciones, obtenerDatosUsuarios, loadFestivos]);

  
  // useEffect para detectar conflictos
  useEffect(() => {
    const detectarConflictosMes = async () => {
      if (vacacionesAprobadas.length === 0 || Object.keys(datosUsuarios).length === 0) {
        setConflictosPorFecha({});
        return;
      }
      
      setLoadingConflictos(true);
      const conflictos = {};
      
      try {
        // Obtener días del mes actual
        const dias = obtenerDiasCalendario(mesActual);
        const diasDelMes = dias.filter(dia => dia.getMonth() === mesActual.getMonth());
        
        // Detectar conflictos para cada día con vacaciones
        for (const dia of diasDelMes) {
          const fechaStr = formatYMD(dia);
          const vacacionesDia = getVacacionesDia(dia);
          
          // Solo verificar conflictos si hay vacaciones ese día
          if (vacacionesDia.length > 0) {
            try {
              const conflictosDia = await detectarConflictos(fechaStr);
              
              if (conflictosDia && conflictosDia.length > 0) {
                conflictos[fechaStr] = conflictosDia;
              }
            } catch (error) {
              console.error(`Error detectando conflictos para ${fechaStr}:`, error);
            }
          }
        }
        
        setConflictosPorFecha(conflictos);
        
        // Mostrar alerta si hay muchos conflictos
        const totalConflictos = Object.keys(conflictos).length;
        if (totalConflictos > 5) {
          showInfo(`Se detectaron ${totalConflictos} días con posibles problemas de cobertura este mes`);
        }
        
      } catch (error) {
        console.error('Error general detectando conflictos:', error);
        setConflictosPorFecha({});
      } finally {
        setLoadingConflictos(false);
      }
    };
    
    // Solo ejecutar si tenemos todos los datos necesarios
    if (vacacionesAprobadas.length > 0 && Object.keys(datosUsuarios).length > 0) {
      detectarConflictosMes();
    }
  }, [vacacionesAprobadas, mesActual, datosUsuarios, detectarConflictos]);
  
  
    useEffect(() => {
      return () => {
        // Limpiar estados al cambiar de mes o desmontar
        setDiaSeleccionado(null);
        setDisponibilidadDia({});
      };
    }, [mesActual]);
  
  
    //  obtenerEmpleadosConSolicitudes y obtenerPuestosConSolicitudes
    const empleadosDisponibles = useMemo(() => {
      const empleadosUnicos = [...new Set(vacacionesAprobadas.map(v => v.solicitante))];
      return empleadosUnicos.sort();
    }, [vacacionesAprobadas]);

    const puestosDisponibles = useMemo(() => obtenerPuestosConSolicitudes(), [obtenerPuestosConSolicitudes]);
    const getConflictosAnuales = useMemo(() => {
      if (vistaActual !== 'anual') return 0;
      
      // Calcular conflictos para todo el año
      let totalConflictos = 0;
      const añoActual = mesActual.getFullYear();
      
      // Esto es simplificado - podrías hacer un cálculo más preciso si necesitas
      // Por ahora, usamos el conteo actual de conflictos del mes visible
      return Object.keys(conflictosPorFecha).length;
    }, [vistaActual, mesActual, conflictosPorFecha]);

  // Filtrar vacaciones
  const vacacionesFiltradas = useMemo(() => {
    let filtradas = vacacionesAprobadas;

    if (filtroEmpleado) {
      filtradas = filtradas.filter(v => v.solicitante === filtroEmpleado);
    }

    if (filtroPuesto !== 'Todos') {
      filtradas = filtradas.filter(v => {
        const userData = datosUsuarios[v.solicitante];
        return userData && userData.puesto === filtroPuesto;
      });
    }

    return filtradas;
  }, [vacacionesAprobadas, filtroEmpleado, filtroPuesto, datosUsuarios]);

  // calcularDisponibilidadPorFecha - Obtener disponibilidad de un día específico
  const [disponibilidadDia, setDisponibilidadDia] = useState({});
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  const handleClickDia = async (fecha) => {
    try {
      setDiaSeleccionado(formatYMD(fecha));
      const disponibilidad = await calcularDisponibilidadPorFecha(formatYMD(fecha));
      setDisponibilidadDia(disponibilidad);
    } catch (error) {
      console.error('Error calculando disponibilidad:', error);
    }
  };

  // Obtener vacaciones de un día específico
  const getVacacionesDia = (fecha) => {
    const fechaStr = formatYMD(fecha);
    return vacacionesFiltradas.filter(v => {
        if (!v.fechas?.includes(fechaStr)) return false;
        const set = v._diasCanceladosSet;
        return !(set && set.has(fechaStr));
      });
  };

  // Obtener color del día según disponibilidad y conflictos
  const getColorDisponibilidad = (vacacionesDia, fecha) => {
    const fechaStr = formatYMD(fecha);
    const tieneConflictos = conflictosPorFecha[fechaStr];
    const count = vacacionesDia.length;
    const esFinSemana = esFinDeSemana(fecha)
    const esDiaFestivo = esFestivo(fechaStr);
  
  // Orden de prioridad para colores:
  
  // 1. Festivos (rojo) 
  if (esDiaFestivo) {
    return '#fc546eff'
  }
  
  // 2. Fines de semana (gris)
  if (esFinSemana) {
    return '#e1dfdf';
  }
    
  // 3. Densidad de vacaciones (días laborables normales)
  if (count === 0) return 'transparent';
  if (count <= 3) return '#d7fbd7ff'; // Verde claro 
  if (count <= 6) return '#faf6cdff'; // Naranja claro  
  return '#fad3d9ff'; // Rojo claro 
};

  // Handlers
  const handleCambiarMes = (direccion) => {
    setMesActual(navegarMes(mesActual, direccion));
    setDiaSeleccionado(null); // Limpiar selección
    setDisponibilidadDia({});
  };


  const handleCambiarAño = (año) => {
    const nuevaFecha = new Date(mesActual);
    nuevaFecha.setFullYear(año);
    setMesActual(nuevaFecha);
    setDiaSeleccionado(null);
    setDisponibilidadDia({});
  };

  // Generar opciones de años (actual ± 3 años)
  const añosDisponibles = () => {
    const añoActual = new Date().getFullYear();
    const años = [];
    for (let i = añoActual - 2; i <= añoActual + 3; i++) {
      años.push(i);
    }
    return años;
  };


  const VistaAnual = () => {
    const año = mesActual.getFullYear();
    const meses = [];
    
    for (let mes = 0; mes < 12; mes++) {
      const fechaMes = new Date(año, mes, 1);
      const vacacionesMes = vacacionesFiltradas.filter(v =>
        Array.isArray(v.fechas) &&
        v.fechas.some(f => {
          const d = new Date(f);
          const set = v._diasCanceladosSet;
          const esMes = d.getFullYear() === año && d.getMonth() === mes;
          return esMes && !(set && set.has(f));
        })
      );
      const personasUnicasDelMes = new Set(
          vacacionesFiltradas
            .filter(v =>
              Array.isArray(v.fechas) &&
              v.fechas.some(f => {
                const d = new Date(f);
                const set = v._diasCanceladosSet;
                const esMes = d.getFullYear() === año && d.getMonth() === mes;
                return esMes && !(set && set.has(f));
              })
            )
            .map(v => v.solicitante)
        );
      
      meses.push({
        fecha: fechaMes,
        personasUnicas: personasUnicasDelMes.size,
        vacaciones: vacacionesMes.length,
        diasTotales: vacacionesFiltradas.reduce((acc, v) => {
            if (!Array.isArray(v.fechas)) return acc;
            const set = v._diasCanceladosSet;
            const diasMes = v.fechas.filter(f => {
              const d = new Date(f);
              const esMes = d.getFullYear() === año && d.getMonth() === mes;
              return esMes && !(set && set.has(f));
            }).length;
            return acc + diasMes;
          }, 0)
      });
    }

    return (
      <Grid container spacing={2}>
        {meses.map((mes, index) => (
          <Grid size={{xs:6, sm:4, md:3}} key={index}>
            <Paper
              sx={{
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: mes.personasUnicas > 0 ? 'primary.50' : 'grey.50',
                '&:hover': { bgcolor: 'primary.100' }
              }}
              onClick={() => {
                setMesActual(mes.fecha);
                setVistaActual('mensual');
              }}
            >
              <Typography variant="h6" gutterBottom>
                {mes.fecha.toLocaleDateString('es-ES', { month: 'long' })}
              </Typography>
              <Chip 
                label={`${mes.personasUnicas} personas`}
                size="small"
                color={mes.personasUnicas >=6 ? 'error' : mes.personasUnicas >= 3 ? 'warning' : 'success'}
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {mes.diasTotales} días total
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Componente Día del Calendario
  const DiaNormal = ({ dia, vacaciones }) => {
    const esHoy = formatYMD(dia) === formatYMD(new Date());
    const fueraMes = dia.getMonth() !== mesActual.getMonth();
    const fechaStr = formatYMD(dia);
    const colorFondo = getColorDisponibilidad(vacaciones, dia);
    const tieneConflictos = conflictosPorFecha[fechaStr];
    const esSeleccionado = diaSeleccionado === fechaStr;

    return (
      <Paper
        sx={{
          minHeight: 60,
          p: 0.4,
          cursor: 'pointer',
          bgcolor: colorFondo,
          border: esHoy ? '2px solid' : esSeleccionado ? '2px solid' : '1px solid',
          borderColor: esHoy ? 'dorado.main' : esSeleccionado ? 'azul.main' : 'divider',
          opacity: fueraMes ? 0.5 : 1,
          position: 'relative',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            transform: 'translateY(-1px)'
          }
        }}
        onClick={() => handleClickDia(dia)}
      >
        {/* Indicador de conflictos */}
        {tieneConflictos && tieneConflictos.length > 0 && (
          <Box sx={{ position: 'absolute', top: 2, right: 2, }}>
              <WarningIcon fontSize="small" sx={{color:tieneConflictos.some(c => c.severidad === 'alta') ? 'rojo.main' : 'naranja.main'}} />          
          </Box>
        )}

        {/* Número del día */}
        <Typography variant="caption" fontWeight={esHoy ? 700 : 500}>
          {dia.getDate()}
        </Typography>

        {/* Avatars de empleados en vacaciones */}
        {vacaciones.length > 0 && (
          <Box display="flex" justifyContent="center" sx={{ mt: 0.5 }}>
              <Avatar  
                sx={{ fontSize: '0.8rem', fontWeight:'bold', height: 25, width: 25, 
                  bgcolor:vacaciones.length >= 7 ? 'rojo.main' : vacaciones.length >= 4 ? 'naranja.main' : 'verde.main'  }}>
                {`${vacaciones.length}`}              
              </Avatar>
          </Box>
        )}
      </Paper>
    );
  };

  const dias = obtenerDiasCalendario(mesActual);

  if  (loading) return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Cargando calendario de vacaciones...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Obteniendo solicitudes aprobadas y datos de empleados
      </Typography>
    </Box>)
    else
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
              Calendario de Vacaciones
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Visualiza la planificación del equipo
            </Typography>
          </Box>
           {loadingConflictos && (
            <Box sx={{ mr: 2 }}>
              <CircularProgress size={20} color="inherit" />
            </Box>
          )}
          
          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
          <CalendarMonthIcon  sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ pb: 4,px:1 }}>
        {/* Loading general */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        

        {/* Controles principales */}
        <Card sx={{ mb: 3}}>
          <CardContent sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              {/* Navegación de mes/año y vista */}
              <Grid size={{xs:12,  md:6}}>
                <Box sx={{ display: 'flex', justifyContent:"space-around",  alignItems: 'center', gap: 1 }}>
                  <Button
                    size="large"
                    startIcon={<TodayIcon />}
                    onClick={() => {
                      setMesActual(new Date());
                      setVistaActual('mensual');
                    }}
                    sx={{ ml: 1 }}
                  >
                    <Typography sx={{fontSize:'1.2rem'}}>
                    Hoy
                    </Typography>
                  </Button>

                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <Select
                      value={mesActual.getFullYear()}
                      onChange={(e) => handleCambiarAño(e.target.value)}
                      displayEmpty
                    >
                      {añosDisponibles().map(año => (
                        <MenuItem key={año} value={año}>
                          {año}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  </Box>
                  </Grid>
                  <Grid size={{xs:12,  md:6}}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 2, md: 0 } }}>
                  {vistaActual === 'mensual' && (
                    <Box display='flex' alignItems="center" width="100%">
                      <IconButton onClick={() => handleCambiarMes(-1)} sx={{fontSize:'3rem'}}>
                        <ChevronLeftIcon sx={{fontSize:'2.5rem'}}/>
                      </IconButton>
                      
                      <Typography fontWeight={600} sx={{ fontSize:'1.6rem', flex:1, minWidth: 160, textAlign: 'center' }}>
                        {formatearMesAno(mesActual)}
                      </Typography>
                      
                      <IconButton onClick={() => handleCambiarMes(1)} size="small">
                        <ChevronRightIcon sx={{fontSize:'2.5rem'}} />
                      </IconButton>
                    </Box>
                  )}

                  {vistaActual === 'anual' && (
                    <Box display='flex' alignItems="center" width="100%" justifyContent="center">
                      <Typography fontWeight={600} sx={{ fontSize:'1.6rem', minWidth: 170, textAlign: 'center' }}>
                        Año {mesActual.getFullYear()}
                      </Typography>
                    </Box>
                  )}
  
                </Box>
              </Grid>

              {/* Selector de vista */}
              <Grid size={{xs:12, md:2}}>
                <ButtonGroup size="large" fullWidth>
                  <Button
                    variant={vistaActual === 'mensual' ? 'contained' : 'outlined'}
                    startIcon={<CalendarViewMonthIcon />}
                    onClick={() => setVistaActual('mensual')}
                  >
                    Mensual
                  </Button>
                  <Button
                    variant={vistaActual === 'anual' ? 'contained' : 'outlined'}
                    startIcon={<ViewModuleIcon />}
                    onClick={() => {
                      setDiaSeleccionado(null)
                      setVistaActual('anual')}}
                  >
                    Anual
                  </Button>
                </ButtonGroup>
              </Grid>

              {/* Filtros */}
              <Grid size={{xs:12, md:2}}>
                <FormControl fullWidth size="small">
                  <InputLabel>Empleado</InputLabel>
                  <Select
                    value={filtroEmpleado}
                    label="Empleado"
                    onChange={(e) => setFiltroEmpleado(e.target.value)}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {empleadosDisponibles.map(empleado => (
                      <MenuItem key={empleado} value={empleado}>
                        {datosUsuarios[empleado]?.nombre || empleado}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{xs:12, md:2}}>
                <FormControl fullWidth size="small">
                  <InputLabel>Puesto</InputLabel>
                  <Select
                    value={filtroPuesto}
                    label="Puesto"
                    onChange={(e) => setFiltroPuesto(e.target.value)}
                  >
                    {puestosDisponibles.map(puesto => (
                      <MenuItem key={puesto} value={puesto}>
                        {puesto}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Alertas de conflictos */}
            {Object.keys(conflictosPorFecha).length > 0 && (
              <Alert 
                severity="warning" 
                sx={{ mt: 2 }}
              >
                <Typography variant="body2">
                  <strong>Detectados {Object.keys(conflictosPorFecha).length} días con problemas de cobertura este mes.</strong>
                  {' '}Los días marcados pueden tener insuficiente personal en algunos puestos.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Calendario principal */}
          <Grid size={{xs:12,  lg: diaSeleccionado ? 8 : 10}}>
            <Card>
              <CardContent>
                {/* Header del calendario */}
                <Typography variant="h5" sx={{mb:1}}>
                  Vista {vistaActual === 'mensual' ? 'Mensual' : 'Anual'}
                </Typography>
                <Box sx={{ display: 'flex',  alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                 

                   {/* Vista Mensual con conteo de personas */}
                  {vistaActual === 'mensual' && (() => {
                    const solicitudesConFechasEnMes = vacacionesFiltradas.filter(s => {
                      if (!Array.isArray(s.fechas)) return false;
                      const set = s._diasCanceladosSet;
                      return s.fechas.some(f => {
                        const d = new Date(f);
                        const esDelMes = d.getFullYear() === mesActual.getFullYear() && d.getMonth() === mesActual.getMonth();
                        return esDelMes && !(set && set.has(f));
                      });
                    });

                    // ✅ Personas únicas con al menos 1 fecha útil en el mes
                    const personasUnicasDelMes = new Set(solicitudesConFechasEnMes.map(s => s.solicitante));

                  return (
                    <Chip 
                      icon={<PersonIcon />}
                      label={`${personasUnicasDelMes.size} personas de vacaciones`} 
                      color="success"
                      variant="outlined"
                    />
                  );
                })()}
                  {/* ✅ VISTA MENSUAL: Mostrar conflictos del mes si los hay */}
                  {vistaActual === 'mensual' && Object.keys(conflictosPorFecha).length > 0 && (
                    <Chip 
                      icon={<ErrorIcon />}
                      label={`${Object.keys(conflictosPorFecha).length} conflictos`}
                      color="error"
                      variant="outlined"
                      size="small"
                    />
                  )}

                </Box>

                {/* Renderizar vista según selección */}
                {vistaActual === 'anual' ? (
                  <VistaAnual />
                ) : (
                  <>
                    {/* Días de la semana */}
                    <Grid container sx={{ mb: 1 }}>
                      {DIAS_SEMANA.map(dia => (
                        <Grid size={{xs:12/7}} key={dia}>
                          <Typography 
                            variant="caption" 
                            fontWeight={600} 
                            sx={{ display: 'block', textAlign: 'center', p: 1 }}
                          >
                            {dia}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>

                    {/* Grid del calendario */}
                    <Grid container spacing={0}>
                      {dias.map((dia, index) => {
                        const vacacionesDia = getVacacionesDia(dia);
                        return (
                          <Grid size={{xs:12/7}}key={index}>
                            <DiaNormal dia={dia} vacaciones={vacacionesDia} />
                          </Grid>
                        );
                      })}
                    </Grid>

                    {/* Leyenda */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>         
                        <Box sx={{ width: 20, height: 20, bgcolor: '#d7fbd7', border: '1px solid #ddd' }} />
                        <Typography variant="caption">Ausencia Baja (1-3)</Typography>
                      </Box>  
                       
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 20, height: 20, bgcolor: '#faf6cd', border: '1px solid #ddd' }} />
                        <Typography variant="caption">Ausencia Media (4-6)</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 20, height: 20, bgcolor: '#fad3d9', border: '1px solid #ddd' }} />
                        <Typography variant="caption">Ausencia Alta (6+)</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WarningIcon fontSize="small" sx={{color:"naranja.main"}} />
                        <Typography variant="caption">Conflicto de cobertura</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Avatar sx={{ height: 22, width: 22, bgcolor:'grey.100', border: '1px solid grey' }}>
                          <Typography color="black" sx={{ fontSize:'0.75rem'}}></Typography>
                        </Avatar> 
                        <Typography variant="caption">Personas Ausentes</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                         <Box sx={{ width: 20, height: 25, borderColor:'dorado.main', borderRadius:0.5, border: '2px solid' }} />
                        <Typography variant="caption">Hoy</Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Panel lateral */}
          <Grid size={{xs:12, lg: diaSeleccionado ? 4 : 2}}>
            {/* Detalles del día seleccionado */}
            {diaSeleccionado && disponibilidadDia.enVacaciones && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex"  alignItems="center" sx={{p:0.5,px:1, borderRadius:2, mb:2,bgcolor:'verde.fondo'}} >
                  <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center',  }}>
                    <ScheduleIcon color="primary" sx={{mr:1}}/> 
                    {formatearFechaLarga(diaSeleccionado)}
                  </Typography>
                  </Box>
                  
                  {disponibilidadDia.totalEnVacaciones > 0 ? (
                    <Box>
                      <Typography fontSize='1.4rem' >
                        {disponibilidadDia.totalEnVacaciones} persona{disponibilidadDia.totalEnVacaciones > 1 ? 's' : ''} de vacaciones
                      </Typography>
                      <Divider sx={{bgcolor:'black', mb:1}}/>
                      
                      {disponibilidadDia.porPuesto && Object.entries(disponibilidadDia.porPuesto).map(([puesto, empleados]) => (
                        <Box key={puesto} sx={{ mb: 1 }}>
                          <Typography fontSize='1.35rem' fontWeight={600}>
                            {puesto} ({empleados.length})
                          </Typography>
                          <Box sx={{ pl: 1 }}>
                            
                            {[...empleados]
                              .sort((a, b) => a.nombre.localeCompare(b.nombre))
                              .map((emp, idx) => (
                              <Typography key={idx} fontSize='1.2rem' display="block">
                                • {emp.nombre}
                              </Typography>
                            ))}
                          </Box>
                        </Box>
                      ))}

                      {/* Mostrar conflictos del día */}
                      {conflictosPorFecha[diaSeleccionado] && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          <Typography variant="subtitle1">
                            Posible problema de cobertura en: {' '}
                            {conflictosPorFecha[diaSeleccionado].map(c => c.puesto).join(', ')}
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info">
                      <Typography sx={{ fontSize: '1.1rem' }}>
                      No hay empleados de vacaciones este día
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Próximos 10 días con vacaciones */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex"  alignItems="center" sx={{p:0.5,px:1, borderRadius:2, mb:2,bgcolor:'verde.fondo'}} >
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TodayIcon color="primary" />
                  Próximos 10 Días
                </Typography>
                </Box>
                
                {(() => {
                  //  Generar próximos 10 días
                  const generarProximos10Dias = () => {
                    const dias = [];
                    const hoy = new Date();
                    
                    for (let i = 0; i < 10; i++) {
                      const fecha = new Date(hoy);
                      fecha.setDate(hoy.getDate() + i);
                      dias.push(fecha);
                    }
                    return dias;
                  };

                  //  Obtener vacaciones por día
                  const obtenerVacacionesPorDia = (fecha) => {
                    const fechaStr = formatYMD(fecha);
                    return vacacionesAprobadas.filter(v => {
                      if (!v.fechas?.includes(fechaStr)) return false;
                      const set = v._diasCanceladosSet;
                      return !(set && set.has(fechaStr));
                      });}

                  //  Obtener etiqueta del día
                  const obtenerEtiquetaDia = (fecha) => {
                    const hoy = new Date();
                    const mañana = new Date(hoy);
                    mañana.setDate(hoy.getDate() + 1);
                    
                    if (formatYMD(fecha) === formatYMD(hoy)) {
                      return 'Hoy';
                    } else if (formatYMD(fecha) === formatYMD(mañana)) {
                      return 'Mañana';
                    } else {
                      return formatearFechaCorta(formatYMD(fecha));
                    }
                  };

                  const obtenerEmpleadosConHoras = (vacacionesDia) => {
                    const empleadosMap = new Map();
                    
                    vacacionesDia.forEach(vacacion => {
                      const empleado = vacacion.solicitante;
                      const horas = vacacion.horasSolicitadas || 8; // Default 8 horas si no está especificado
                      
                      if (empleadosMap.has(empleado)) {
                        // Si el empleado ya existe, sumar las horas (en caso de múltiples solicitudes el mismo día)
                        empleadosMap.set(empleado, empleadosMap.get(empleado) + horas);
                      } else {
                        empleadosMap.set(empleado, horas);
                      }
                    });
                    
                    return Array.from(empleadosMap, ([empleado, horas]) => ({ empleado, horas }));
                  };

                  const proximos10Dias = generarProximos10Dias();
                  const diasConVacaciones = proximos10Dias.filter(dia => 
                    obtenerVacacionesPorDia(dia).length > 0
                  );

                  if (diasConVacaciones.length === 0) {
                    return (
                      <Alert severity="info" >
                        <Typography sx={{ fontSize: '1.2rem' }}>
                        No hay empleados de vacaciones en los próximos 10 días
                        </Typography>
                      </Alert>
                    );
                  }

                  return ( 
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {diasConVacaciones.map((dia, indexDia) => {
                        const vacacionesDia = obtenerVacacionesPorDia(dia);
                        const etiquetaDia = obtenerEtiquetaDia(dia);
                        const empleadosConHoras = obtenerEmpleadosConHoras(vacacionesDia);
                        
                        return (
                          <Box key={indexDia} sx={{ mb: 2 }}>
                            {/* Header del día */}
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent:'space-between',
                              alignItems: 'center', 
                              mb: 0.5,
                              p: 1,
                              bgcolor: etiquetaDia === 'Hoy' ? 'azul.fondo' : 
                                      etiquetaDia === 'Mañana' ? 'naranja.fondo' : 'grey.50',
                              borderRadius: 1,
                              borderLeft: 4,
                              borderColor: etiquetaDia === 'Hoy' ? 'primary.main' : 
                                          etiquetaDia === 'Mañana' ? 'warning.main' : 'grey.400'
                            }}>
                              <Typography fontSize="1.4rem" fontWeight={600}>
                                {etiquetaDia}
                              </Typography>
                              <Chip 
                                label={`${empleadosConHoras.length} persona${empleadosConHoras.length > 1 ? 's' : ''}`}
                                size="medium"
                                color={etiquetaDia === 'Hoy' ? 'primary' : 
                                      etiquetaDia === 'Mañana' ? 'warning' : 'default'}
                              />
                            </Box>

                            {/* Lista de empleados del día */}
                            <Box sx={{  }}>
                              {empleadosConHoras
                                .sort((a, b) => {
                                  const nombreA = datosUsuarios[a.empleado]?.nombre || a.empleado;
                                  const nombreB = datosUsuarios[b.empleado]?.nombre || b.empleado;
                                  return nombreA.localeCompare(nombreB);
                                })
                                .map((item, indexEmpleado) => {
                                  const userData = datosUsuarios[item.empleado] || {};
                                  const esHorasParciales = item.horas < 8;
                                  
                                  return (
                                    <Box 
                                      key={indexEmpleado} 
                                      sx={{ 
                                        display: 'flex',
                                        alignItems:'center', 
                                        gap: 1, 
                                        mb: 0.5,
                                        p: 0.5,
                                        borderRadius: 0.5,
                                        '&:hover': { bgcolor: 'grey.50' }
                                      }}
                                    >
                                        <Typography fontSize='1.25rem' fontWeight={500}>
                                          • {userData.nombre} 
                                        </Typography>
                                        {esHorasParciales&& (
                                        <Typography sx={{ color:'rojo.main'}} fontSize='1.15rem' fontWeight={700}>
                                           {` • ${item.horas} hora${item.horas==1? '':'s'}`}
                                        </Typography>
                                         )}

                                    </Box>
                                  );
                                })}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  );
                })()}
              </CardContent>
            </Card>


            {/* Estadísticas rápidas */}
            <Card>
              <CardContent>
                <Box display="flex"  alignItems="center" sx={{p:0.5,px:1, borderRadius:2, mb:2,bgcolor:'verde.fondo'}} >
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', px:1 }}>
                  <GroupsIcon color="primary" sx={{mr:2}} />
                  Resumen del {vistaActual === 'mensual' ? 'Mes' : 'Año'}
                </Typography>
                </Box>
                
               {vistaActual === 'mensual' ? (
                // ✅ ESTADÍSTICAS MENSUALES
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(() => {
                    // ✅ Solicitudes con al menos 1 fecha útil (no cancelada) en el mes visible
                    const solicitudesConFechasEnMes = vacacionesFiltradas.filter(s => {
                      if (!Array.isArray(s.fechas)) return false;
                      const set = s._diasCanceladosSet;
                      return s.fechas.some(f => {
                        const d = new Date(f);
                        const esDelMes = d.getFullYear() === mesActual.getFullYear() && d.getMonth() === mesActual.getMonth();
                        return esDelMes && !(set && set.has(f));
                      });
                    });

                    // ✅ Personas únicas con al menos 1 fecha útil en el mes
                    const empleadosUnicosDelMes = new Set(solicitudesConFechasEnMes.map(s => s.solicitante));

                    // ✅ Días totales del mes (solo fechas no canceladas)
                    let diasTotalesDelMes = 0;
                    solicitudesConFechasEnMes.forEach(s => {
                      const set = s._diasCanceladosSet;
                      s.fechas.forEach(f => {
                        const d = new Date(f);
                        const esDelMes = d.getFullYear() === mesActual.getFullYear() && d.getMonth() === mesActual.getMonth();
                        if (esDelMes && !(set && set.has(f))) diasTotalesDelMes++;
                      });
                    });

                    return (
                      <>                   
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1">Empleados de vacaciones:</Typography>
                          <Chip label={empleadosUnicosDelMes.size} size="small" />
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1">Días de vacaciones del mes:</Typography>
                          <Chip label={diasTotalesDelMes} size="small" color="primary" />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1">Días con conflictos:</Typography>
                          <Chip 
                            label={Object.keys(conflictosPorFecha).length} 
                            size="small" 
                            color={Object.keys(conflictosPorFecha).length > 0 ? 'error' : 'success'}
                          />
                        </Box>
                      </>
                    );
                  })()}
                </Box>
              ) : (
                // ✅ ESTADÍSTICAS ANUALES
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(() => {
                    const añoActual = mesActual.getFullYear();
                    const solicitudesDelAño = vacacionesFiltradas.filter(solicitud => {
                      const primerDia = new Date(solicitud.fechas[0]);
                      return primerDia.getFullYear() === añoActual;
                    });

                    const empleadosUnicosDelAño = new Set(
                      solicitudesDelAño
                        .filter(s =>
                          Array.isArray(s.fechas) &&
                          s.fechas.some(f => {
                            const d = new Date(f);
                            const set = s._diasCanceladosSet;
                            return d.getFullYear() === añoActual && !(set && set.has(f));
                          })
                        )
                        .map(s => s.solicitante)
                    );
                    const diasTotalesDelAño = solicitudesDelAño.reduce((acc, s) => {
                      if (!Array.isArray(s.fechas)) return acc;
                      const set = s._diasCanceladosSet;
                      const dias = s.fechas.filter(f => {
                        const d = new Date(f);
                        return d.getFullYear() === añoActual && !(set && set.has(f));
                      }).length;
                      return acc + dias;
                    }, 0);

                    return (
                      <>                       
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1">Empleados de vacaciones:</Typography>
                          <Chip label={empleadosUnicosDelAño.size} size="small" />
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1">Días de vacaciones del año:</Typography>
                          <Chip label={diasTotalesDelAño} size="small" color="primary" />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1">Posibles conflictos detectados:</Typography>
                          <Chip 
                            label={getConflictosAnuales} 
                            size="small" 
                            color={getConflictosAnuales > 0 ? 'warning' : 'success'}
                          />
                        </Box>
                      </>
                    );
                  })()}
                </Box>
              )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default CalendarioVacacionesAdmin;
