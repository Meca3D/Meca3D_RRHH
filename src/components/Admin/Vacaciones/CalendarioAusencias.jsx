// components/Ausencias/CalendarioAusencias.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, FormControl, InputLabel, Select, MenuItem,
  Grid, Alert, Chip, Avatar, LinearProgress, Paper, Divider,
  ButtonGroup, Tooltip, CircularProgress
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
  Schedule as ScheduleIcon,
  MedicalServices as MedicalServicesIcon,
  EventBusy as EventBusyIcon,
  BeachAccess as BeachAccessIcon,
  PersonOff as PersonOffIcon
} from '@mui/icons-material';

import { useAusenciasStore } from '../../../stores/ausenciasStore';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useEmpleadosStore } from '../../../stores/empleadosStore';
import { useUIStore } from '../../../stores/uiStore';
import { capitalizeFirstLetter } from '../../Helpers';
import { 
  formatYMD, obtenerDiasCalendario, navegarMes, formatearMesAno, 
  esFinDeSemana, formatearFechaLarga, formatearFechaCorta 
} from '../../../utils/dateUtils';
import { formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';

const CalendarioAusencias = () => {
  const navigate = useNavigate();

  const { getAusenciasCombinadas } = useAusenciasStore();
  const { 
    loadConfigVacaciones, 
    configVacaciones, 
    loadFestivos, 
    esFestivo 
  } = useVacacionesStore();
  const { fetchEmpleados, empleados } = useEmpleadosStore();
  const { showError } = useUIStore();

  // Estados principales
  const [mesActual, setMesActual] = useState(new Date());
  const [vistaActual, setVistaActual] = useState('mensual');
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  
  // Datos
  const [ausenciasCombinadas, setAusenciasCombinadas] = useState([]); 
  const [loading, setLoading] = useState(false);

  // Filtros
  const [tiposFiltro, setTiposFiltro] = useState(['vacaciones', 'bajas', 'permisos']);
  const [filtroEmpleado, setFiltroEmpleado] = useState('Todos');
  const [filtroPuesto, setFiltroPuesto] = useState('Todos');

  const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // --- 1. CARGA DE DATOS ---
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const año = mesActual.getFullYear();
        
        await Promise.all([
          loadConfigVacaciones(),
          loadFestivos(año),
          fetchEmpleados()
        ]);
        
        const data = await getAusenciasCombinadas(año);
        setAusenciasCombinadas(data.todas || []);

      } catch (error) {
        showError(`Error cargando calendario: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [mesActual.getFullYear(), loadConfigVacaciones, loadFestivos, fetchEmpleados, getAusenciasCombinadas]);

  // --- 2. PROCESAMIENTO DE DATOS (USEMEMO) ---

  const empleadosMap = useMemo(() => {
    const map = {};
    empleados.forEach(emp => {
      map[emp.email] = {
        nombre: emp.nombre || emp.email,
        puesto: emp.puesto || 'Sin definir'
      };
    });
    return map;
  }, [empleados]);

  const puestosDisponibles = useMemo(() => {
    const puestos = new Set(empleados.map(e => e.puesto).filter(Boolean));
    return ['Todos', ...Array.from(puestos).sort()];
  }, [empleados]);

  const ausenciasPorDia = useMemo(() => {
    const mapa = {};
    ausenciasCombinadas.forEach(ausencia => {
      const fechas = ausencia.fechasActuales || [];
      // Asegurar tipo por defecto
      const tipo = ausencia.tipoAusencia || (ausencia.esVenta ? 'venta' : 'vacaciones');
      
      fechas.forEach(fechaStr => {
        if (!mapa[fechaStr]) mapa[fechaStr] = [];
        
        const datosEmpleado = empleadosMap[ausencia.solicitante] || { nombre: 'Desconocido', puesto: 'Sin definir' };
        
        mapa[fechaStr].push({
          id: ausencia.id,
          email: ausencia.solicitante,
          nombre: datosEmpleado.nombre,
          puesto: datosEmpleado.puesto,
          tipo: tipo, // 'vacaciones', 'baja', 'permiso'
          motivo: ausencia.motivo || ausencia.concepto || '',
          horas: ausencia.horasSolicitadas
        });
      });
    });
    return mapa;
  }, [ausenciasCombinadas, empleadosMap]);

  const conflictosDelMes = useMemo(() => {
    if (!configVacaciones?.cobertura?.umbrales) return {};
    const umbrales = configVacaciones.cobertura.umbrales;
    const conflictos = {}; 

    Object.entries(ausenciasPorDia).forEach(([fechaStr, ausentes]) => {
      const fechaObj = new Date(fechaStr);
      if (fechaObj.getMonth() !== mesActual.getMonth() || fechaObj.getFullYear() !== mesActual.getFullYear()) return;

      const conteoPorPuesto = ausentes.reduce((acc, curr) => {
        const puesto = curr.puesto;
        acc[puesto] = (acc[puesto] || 0) + 1;
        return acc;
      }, {});

      const problemasDia = [];
      Object.entries(conteoPorPuesto).forEach(([puesto, total]) => {
        if (umbrales[puesto] && total >= umbrales[puesto]) {
          problemasDia.push({
            puesto,
            total,
            umbral: umbrales[puesto],
            severidad: total >= umbrales[puesto] * 1.5 ? 'alta' : 'media'
          });
        }
      });

      if (problemasDia.length > 0) {
        conflictos[fechaStr] = problemasDia;
      }
    });

    return conflictos;
  }, [ausenciasPorDia, configVacaciones, mesActual]);

  // --- 3. HELPERS VISUALES ---

  const getAusentesVisibles = (fechaStr) => {
    const todos = ausenciasPorDia[fechaStr] || [];
    return todos.filter(a => {
      let tipoCheck = a.tipo;
      if (tipoCheck === 'baja') tipoCheck = 'bajas';       
      if (tipoCheck === 'permiso') tipoCheck = 'permisos';
      if (tipoCheck === 'venta') tipoCheck = 'vacaciones'; 

      if (!tiposFiltro.includes(tipoCheck)) return false;
      
      if (filtroEmpleado !== 'Todos' && a.email !== filtroEmpleado) return false;
      if (filtroPuesto !== 'Todos' && a.puesto !== filtroPuesto) return false;
      return true;                 
    }).sort((a, b) => {
        const ordenTipo = { vacaciones: 0, baja: 1, permiso: 2 };
        const ta = ordenTipo[a.tipo] ?? 99;
        const tb = ordenTipo[b.tipo] ?? 99;
        if (ta !== tb) return ta - tb;

        return (a.nombre ?? "").localeCompare(b.nombre ?? "", "es", { sensitivity: "base" });
      });
    
  };

  const getColorDia = (fecha, fechaStr) => {
    if (esFestivo(fechaStr)) return '#fc546eff'; 
    if (esFinDeSemana(fecha)) return '#e1dfdf';
    
    const totalAusentes = (ausenciasPorDia[fechaStr] || []).length;

    if (totalAusentes === 0) return 'transparent';
    if (totalAusentes <= 3) return '#d7fbd7ff'; 
    if (totalAusentes <= 6) return '#faf6cdff'; 
    return '#fad3d9ff'; 
  };

  const getIconoTipo = (tipo) => {
    switch (tipo) {
      case 'baja': return <MedicalServicesIcon fontSize="small" />;
      case 'permiso': return <EventBusyIcon fontSize="small" />;
      default: return <BeachAccessIcon fontSize="small" />;
    }
  };

  const getColorTipo = (tipo) => {
    switch (tipo) {
      case 'baja': return 'error.main';
      case 'permiso': return 'purpura.main'; 
      default: return 'success.main';
    }
  };

  // --- 4. COMPONENTES INTERNOS ---

  const DiaNormal = ({ dia }) => {
    const fechaStr = formatYMD(dia);
    const esHoy = fechaStr === formatYMD(new Date());
    const fueraMes = dia.getMonth() !== mesActual.getMonth();
    const isSelected = diaSeleccionado === fechaStr;
    const ausentesVisibles = getAusentesVisibles(fechaStr);
    const conflictos = conflictosDelMes[fechaStr];
    const colorFondo = getColorDia(dia, fechaStr);

    return (
      <Paper
        onClick={() => setDiaSeleccionado(fechaStr)}
        sx={{
          minHeight: 60,
          p: 0.4,
          cursor: 'pointer',
          bgcolor: colorFondo,
          border: esHoy ? '2px solid' : isSelected ? '2px solid' : '1px solid',
          borderColor: esHoy ? 'dorado.main' : isSelected ? 'azul.main' : 'divider',
          opacity: fueraMes ? 0.5 : 1,
          position: 'relative',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            transform: 'translateY(-1px)'
          }
        }}
      >
        {conflictos && conflictos.length > 0 && (
          <Box sx={{ position: 'absolute', top: 2, right: 2 }}>
            <WarningIcon fontSize="small" sx={{ color: conflictos.some(c => c.severidad === 'alta') ? 'rojo.main' : 'naranja.main' }} />          
          </Box>
        )}

        <Typography variant="caption" fontWeight={esHoy ? 700 : 500}>
          {dia.getDate()}
        </Typography>

        {ausentesVisibles.length > 0 && (
          <Box display="flex" justifyContent="center" sx={{ mt: 0.5 }}>
            <Avatar sx={{ 
              fontSize: '0.8rem', fontWeight: 'bold', height: 25, width: 25, 
              bgcolor: ausentesVisibles.length >= 7 ? 'rojo.main' : ausentesVisibles.length >= 4 ? 'naranja.main' : 'verde.main' 
            }}>
              {ausentesVisibles.length}              
            </Avatar>
          </Box>
        )}
      </Paper>
    );
  };

  const VistaAnual = () => {
    const año = mesActual.getFullYear();
    const meses = [];
    
    for (let mes = 0; mes < 12; mes++) {
      const fechaMes = new Date(año, mes, 1);
      let personasUnicas = new Set();
      let diasTotales = 0;

      const diasDelMes = obtenerDiasCalendario(fechaMes).filter(d => d.getMonth() === mes);
      diasDelMes.forEach(dia => {
        const fStr = formatYMD(dia);
        const ausentes = getAusentesVisibles(fStr); 
        ausentes.forEach(a => personasUnicas.add(a.email));
        diasTotales += ausentes.length;
      });
      
      meses.push({
        fecha: fechaMes,
        personasUnicas: personasUnicas.size,
        diasTotales: diasTotales
      });
    }

    return (
      <Grid container spacing={2}>
        {meses.map((mes, index) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
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
                {capitalizeFirstLetter(mes.fecha.toLocaleDateString('es-ES', { month: 'long' }))}
              </Typography>
              <Chip 
                label={`${mes.personasUnicas} personas`}
                size="small"
                color={mes.personasUnicas >= 6 ? 'error' : mes.personasUnicas >= 3 ? 'warning' : 'success'}
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {mes.diasTotales} ausencias
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  const dias = obtenerDiasCalendario(mesActual);
  const empleadosDisponibles = ['Todos', ...Object.keys(empleadosMap).sort()]

  if (loading && ausenciasCombinadas.length === 0) return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 2 }}>Cargando calendario de ausencias...</Typography>
    </Box>
  );

  return (
    <>
      <AppBar sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
          boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
          zIndex: 1100
        }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/admin')}
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' }, transition: 'all 0.3s ease' }}>
            <ArrowBackIosNewIcon />
          </IconButton>

          <Box sx={{ my:0.5, textAlign: 'center', flex: 1}}>
            <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' }, lineHeight: 1.2 }}>
              Calendario de Ausencias
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Vacaciones, Bajas y Permisos
            </Typography>
          </Box>
          
          <IconButton edge="end" color="inherit" sx={{ cursor: 'default' }}>
            <CalendarMonthIcon sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ pb: 4, px: 1 }}>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* --- CONTROLES Y FILTROS --- */}
        <Card sx={{ mb: 3, mt: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              
              {/* Navegación Mes/Año */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ display: 'flex', justifyContent:"space-around", alignItems: 'center', gap: 1 }}>
                  <Button size="large" startIcon={<TodayIcon />} onClick={() => { setMesActual(new Date()); setVistaActual('mensual'); }} sx={{ ml: 1 }}>
                    <Typography sx={{fontSize:'1.2rem'}}>Hoy</Typography>
                  </Button>
                  <ButtonGroup size="small">
                    <Button variant={vistaActual === 'mensual' ? 'contained' : 'outlined'} onClick={() => setVistaActual('mensual')}>
                      <CalendarViewMonthIcon />
                    </Button>
                    <Button variant={vistaActual === 'anual' ? 'contained' : 'outlined'} onClick={() => { setDiaSeleccionado(null); setVistaActual('anual'); }}>
                      <ViewModuleIcon />
                    </Button>
                  </ButtonGroup>
                  </Box>
                  <Box sx={{ display: 'flex', width:'100%', justifyContent:'center', alignItems: 'center', gap: 1 }}>
                    {vistaActual === 'mensual' && (
                      <Box display='flex' justifyContent='space-evenly' alignItems="center" width={'100%'}>
                        <IconButton onClick={() => setMesActual(navegarMes(mesActual, -1))}>
                          <ChevronLeftIcon sx={{fontSize:'2.2rem', fontWeight:'bold', color:'black'}}/>
                        </IconButton>
                        <Typography fontWeight={600} sx={{ fontSize:'1.5rem', minWidth: 140, textAlign: 'center' }}>
                          {capitalizeFirstLetter(formatearMesAno(mesActual))}
                        </Typography>
                        <IconButton onClick={() => setMesActual(navegarMes(mesActual, 1))}>
                          <ChevronRightIcon sx={{fontSize:'2.2rem', fontWeight:'bold', color:'black'}}/>
                        </IconButton>
                      </Box>
                    )}
                    {vistaActual === 'anual' && (
                       <Typography fontWeight={600} sx={{ fontSize:'1.5rem', minWidth: 140, textAlign: 'center' }}>
                        Año {mesActual.getFullYear()}
                      </Typography>
                    )}
                  </Box>
              </Grid>

              {/* Botones de Vista y Tipos */}
              <Grid size={{ xs: 12, md: 4 }}>
                 <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">

                    <ButtonGroup fullWidth>
                      <Button 
                        variant={tiposFiltro.includes('vacaciones') ? "contained" : "outlined"}
                        color="primary"
                        onClick={() => setTiposFiltro(p => p.includes('vacaciones') ? p.filter(t=>t!=='vacaciones') : [...p,'vacaciones'])}
                      >
                        Vacaciones
                      </Button>
                      <Button 
                        variant={tiposFiltro.includes('bajas') ? "contained" : "outlined"}
                        color="error"
                        onClick={() => setTiposFiltro(p => p.includes('bajas') ? p.filter(t=>t!=='bajas') : [...p,'bajas'])}
                      >
                        Bajas
                      </Button>
                      <Button 
                        variant={tiposFiltro.includes('permisos') ? "contained" : "outlined"}
                        sx={{ 
                          // Lógica condicional para el color Morado
                          ...(tiposFiltro.includes('permisos') ? {
                            // Estado ACTIVO (Contained)
                            bgcolor: 'purpura.main',
                            color: 'white',
                            borderColor: 'purpura.main',
                            '&:hover': {
                              bgcolor: 'purpura.dark',
                              borderColor: 'purpura.dark',
                            }
                          } : {
                            // Estado INACTIVO (Outlined)
                            color: 'purpura.main',
                            borderColor: 'purpura.main',
                            '&:hover': {
                              borderColor: 'purpura.main',
                              bgcolor: 'rgba(156, 39, 176, 0.04)' // Un tinte morado suave al pasar el mouse
                            }
                          })
                        }}
                        onClick={() => setTiposFiltro(p => p.includes('permisos') ? p.filter(t=>t!=='permisos') : [...p,'permisos'])}
                      >
                        Permisos
                      </Button>
                    </ButtonGroup>
                 </Box>
              </Grid>

              {/* Filtros Dropdown */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Box display="flex" gap={1}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Empleado</InputLabel>
                    <Select value={filtroEmpleado} label="Empleado" onChange={(e) => setFiltroEmpleado(e.target.value)}>
                      {empleadosDisponibles.map(email => (
                        <MenuItem key={email} value={email}>{email==='Todos'?'Todos':empleadosMap[email]?.nombre}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Puesto</InputLabel>
                    <Select value={filtroPuesto} label="Puesto" onChange={(e) => setFiltroPuesto(e.target.value)}>
                      {puestosDisponibles.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            </Grid>

            {Object.keys(conflictosDelMes).length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Detectados {Object.keys(conflictosDelMes).length} días con problemas de cobertura.</strong>
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* --- CALENDARIO PRINCIPAL --- */}
          <Grid size={{ xs: 12, lg: diaSeleccionado ? 8 : 10 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" sx={{mb:1}}>
                  Vista {vistaActual === 'mensual' ? 'Mensual' : 'Anual'}
                </Typography>
                
                {/* Header Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  {vistaActual === 'mensual' && (() => {
                     const unicos = new Set();
                     dias.filter(d => d.getMonth() === mesActual.getMonth()).forEach(d => {
                        getAusentesVisibles(formatYMD(d)).forEach(a => unicos.add(a.email));
                     });
                     return (
                        <Chip icon={<PersonIcon />} label={`${unicos.size} personas ausentes`} color="success" variant="outlined" />
                     );
                  })()}

                  {vistaActual === 'mensual' && Object.keys(conflictosDelMes).length > 0 && (
                    <Chip icon={<ErrorIcon />} label={`${Object.keys(conflictosDelMes).length} conflictos`} color="error" variant="outlined" size="small" />
                  )}
                </Box>

                {vistaActual === 'anual' ? (
                  <VistaAnual />
                ) : (
                  <>
                    <Grid container sx={{ mb: 1 }}>
                      {DIAS_SEMANA.map(dia => (
                        // CORRECCIÓN 2: Grid V2 size prop
                        <Grid size={{ xs: 12/7 }} key={dia}>
                          <Typography variant="caption" fontWeight={600} sx={{ display: 'block', textAlign: 'center', p: 1 }}>
                            {dia}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>

                    <Grid container spacing={0}>
                      {dias.map((dia, index) => (
                        <Grid size={{ xs: 12/7 }} key={index}>
                          <DiaNormal dia={dia} />
                        </Grid>
                      ))}
                    </Grid>

                    {/* Leyenda Heatmap */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Box display="flex" alignItems="center" gap={0.5}>         
                        <Box sx={{ width: 20, height: 20, bgcolor: '#d7fbd7', border: '1px solid #ddd' }} />
                        <Typography variant="caption">Baja (1-3)</Typography>
                      </Box>  
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 20, height: 20, bgcolor: '#faf6cd', border: '1px solid #ddd' }} />
                        <Typography variant="caption">Media (4-6)</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 20, height: 20, bgcolor: '#fad3d9', border: '1px solid #ddd' }} />
                        <Typography variant="caption">Alta (6+)</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <WarningIcon fontSize="small" sx={{color:"naranja.main"}} />
                        <Typography variant="caption">Conflicto</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                         <Box sx={{ width: 20, height: 25, borderColor:'dorado.main', borderRadius:0.5, border: '2px solid' }} />
                        <Typography variant="caption">Hoy</Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* --- PANEL LATERAL --- */}
          <Grid size={{ xs: 12, lg: diaSeleccionado ? 4 : 2 }}>
            
            {/* 1. DETALLE DEL DÍA */}
            {diaSeleccionado && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" sx={{p:0.5, px:1, borderRadius:2, mb:2, bgcolor:'verde.fondo'}} >
                    <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
                      <ScheduleIcon color="primary" sx={{mr:1}}/> 
                      {formatearFechaLarga(diaSeleccionado)}
                    </Typography>
                  </Box>

                  {/* Conflictos del día */}
                  {conflictosDelMes[diaSeleccionado] && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {conflictosDelMes[diaSeleccionado].map((c, idx) => (
                         <div key={idx}><strong>{c.puesto}:</strong> {c.total} ausentes (Máx {c.umbral})</div>
                      ))}
                    </Alert>
                  )}

                  {(() => {
                    const ausentes = getAusentesVisibles(diaSeleccionado);
                    if (ausentes.length > 0) {
                      return (
                        <Box>
                          <Typography fontSize='1.4rem'>{ausentes.length} persona{ausentes.length > 1 ? 's' : ''} ausentes</Typography>
                          <Divider sx={{bgcolor:'black', mb:1}}/>
                          
                          {ausentes.map((a, idx) => (
                             <Box key={idx} sx={{ mb: 1, display: 'flex', alignItems: 'center', bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                                <Box sx={{ mr: 1, color: getColorTipo(a.tipo) }}>
                                  {getIconoTipo(a.tipo)}
                                </Box>
                                <Box display='flex'justifyContent='space-between' width='100%'alignItems='center'>
                                <Box>
                                  <Typography fontSize='1.1rem' fontWeight={600}>
                                    {a.nombre}
                                  </Typography>
                                  <Typography fontSize='0.85rem' display="block">
                                    {a.puesto} • {capitalizeFirstLetter(a.tipo)}
                                  </Typography>
                                </Box>
                                {a.horas < 8 && (
                                   <Chip label={`${formatearTiempoVacasLargo(a.horas)}`} size="small" color="primary" />
                                )}
                                </Box>
                             </Box>
                          ))}
                        </Box>
                      );
                    } else {
                      return (
                         <Alert severity="info">
                            <Typography sx={{ fontSize: '1.1rem' }}>No hay ausencias (visibles) este día</Typography>
                         </Alert>
                      );
                    }
                  })()}
                </CardContent>
              </Card>
            )}

            {/* 2. PRÓXIMOS 10 DÍAS */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" sx={{p:0.5, px:1, borderRadius:2, mb:2, bgcolor:'verde.fondo'}} >
                  <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TodayIcon color="primary" /> Próximos 10 Días
                  </Typography>
                </Box>
                
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {Array.from({ length: 10 }).map((_, i) => {
                    const fecha = new Date();
                    fecha.setDate(fecha.getDate() + i);
                    const fStr = formatYMD(fecha);
                    const ausentes = getAusentesVisibles(fStr);
                    const ordenTipo = { vacaciones: 0, baja: 1, permiso: 2 };

                    ausentes.sort((a, b) => {
                      const ta = ordenTipo[a.tipo] ?? 99;
                      const tb = ordenTipo[b.tipo] ?? 99;
                      if (ta !== tb) return ta - tb;

                      return (a.nombre ?? "").localeCompare(b.nombre ?? "", "es", { sensitivity: "base" });
                    });
                    
                    if (ausentes.length === 0) return null;

                    const etiquetaDia = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : formatearFechaCorta(fStr);
                    const bgColor = i === 0 ? 'azul.fondo' : i === 1 ? 'naranja.fondo' : 'grey.50';
                    const borderColor = i === 0 ? 'primary.main' : i === 1 ? 'warning.main' : 'grey.400';

                    return (
                      <Box key={i} sx={{ mb: 2 }}>
                        <Box sx={{ 
                          display: 'flex', justifyContent:'space-between', alignItems: 'center', 
                          mb: 0.5, p: 1, bgcolor: bgColor, borderRadius: 1, 
                          borderLeft: 4, borderColor: borderColor
                        }}>
                          <Typography fontSize="1.2rem" fontWeight={600}>{etiquetaDia}</Typography>
                          <Chip label={ausentes.length} size="small" />
                        </Box>
                        {ausentes.map((a, idx) => (
                          <Box key={idx} display="flex" alignItems="center" pl={1} mb={0.5}>
                             <Box sx={{ color: getColorTipo(a.tipo), mr: 0.5, display: 'flex' }}>
                               {getIconoTipo(a.tipo)}
                             </Box>
                             <Typography fontSize='1.15rem'>• {a.nombre}</Typography>
                             {a.horas < 8 && (
                              <Box display='flex' justifyContent='flex-end' flexGrow={1}>
                                <Chip label={`${formatearTiempoVacasLargo(a.horas)}`} size="small" color="primary" />
                                </Box>
                             )}
                          </Box>
                        ))}
                      </Box>
                    );
                  })}
                  
                  {Array.from({length:10}).every((_,i) => {
                     const d = new Date(); d.setDate(d.getDate()+i); 
                     return getAusentesVisibles(formatYMD(d)).length === 0
                  }) && (
                     <Alert severity="info"><Typography>Todo tranquilo próximamente</Typography></Alert>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* 3. RESUMEN RAPIDO */}
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" sx={{p:0.5, px:1, borderRadius:2, mb:2, bgcolor:'verde.fondo'}} >
                   <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', px:1 }}>
                      <GroupsIcon color="primary" sx={{mr:2}} /> Resumen
                   </Typography>
                </Box>
                
                {(() => {
                   let diasCount = 0;
                   const personas = new Set();
                   const conflictosCount = Object.keys(conflictosDelMes).length;
                   
                   const añoV = mesActual.getFullYear();
                   const mesV = mesActual.getMonth();
                   
                   const fechasRelevantes = Object.keys(ausenciasPorDia).filter(fStr => {
                      const d = new Date(fStr);
                      if (vistaActual === 'mensual') return d.getMonth() === mesV && d.getFullYear() === añoV;
                      return d.getFullYear() === añoV;
                   });

                   fechasRelevantes.forEach(fStr => {
                      const list = getAusentesVisibles(fStr);
                      if (list.length > 0) {
                        diasCount += list.length; 
                        list.forEach(a => personas.add(a.email));
                      }
                   });

                   return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                         <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography>Empleados ausentes:</Typography>
                            <Chip label={personas.size} size="small" />
                         </Box>
                         <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography>Días de ausencia:</Typography>
                            <Chip label={diasCount} size="small" color="primary" />
                         </Box>
                         <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography>Días conflictivos:</Typography>
                            <Chip label={conflictosCount} size="small" color={conflictosCount > 0 ? 'error' : 'success'} />
                         </Box>
                      </Box>
                   );
                })()}
              </CardContent>
            </Card>

          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default CalendarioAusencias;