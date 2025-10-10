// components/Vacaciones/SaldosVacaciones.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Container, Box, Grid, Card, CardContent, CardHeader, Collapse,
  IconButton, Chip, Button, CircularProgress, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parse, isValid, addMonths,subYears, startOfYear, lastDayOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';

import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useEmpleadosStore } from '../../../stores/empleadosStore';
import { formatearFechaCorta, formatearFechaEspanol2 } from '../../../utils/dateUtils';
import { formatearTiempoVacas, formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const toYMD = (d) => {
  if (!d) return '';
  if (d instanceof Date && isValid(d)) return format(d, 'yyyy-MM-dd');
  if (d && typeof d.toDate === 'function') {
    const dd = d.toDate();
    return isValid(dd) ? format(dd, 'yyyy-MM-dd') : '';
  }
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  if (typeof d === 'string') {
    const parsed = parse(d, 'dd/MM/yyyy', new Date());
    return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : '';
  }
  return '';
};

export default function SaldosVacaciones() {
  const navigate = useNavigate();

  // Empleados
  const empleados = useEmpleadosStore(s => s.empleados);
  const fetchEmpleados = useEmpleadosStore(s => s.fetchEmpleados);
  const [empleadoEmail, setEmpleadoEmail] = useState('');

  // Eventos de saldo
  const loadSolicitudesVacaciones = useVacacionesStore(s => s.loadSolicitudesVacaciones);

  const getEventosSaldoUsuarioPeriodo = useVacacionesStore(s => s.getEventosSaldoUsuarioPeriodo);

  // UI estado
  const [expanded, setExpanded] = useState({});
  const [fechasExpandidas, setFechasExpandidas] = useState(null);
  const [periodo, setPeriodo] = useState('year');
  const [inicio, setInicio] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); d.setHours(0,0,0,0); return d; });
  const [fin, setFin] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [loading, setLoading] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [saldoInicial, setSaldoInicial] = useState(null);

  // Cargar empleados en tiempo real
  useEffect(() => {
    const off = fetchEmpleados();
    return () => { if (typeof off === 'function') off(); };
  }, [fetchEmpleados]);

  // Ajustar fechas por periodo
  useEffect(() => {
    const hoy = new Date();
    if (periodo === '3m') { setInicio(addMonths(hoy, -3)); setFin(hoy); }
    else if (periodo === '6m') { setInicio(addMonths(hoy, -6)); setFin(hoy); }
    else if (periodo === 'year') { setInicio(startOfYear(hoy)); setFin(hoy); 
     } else if (periodo === 'pastyear') {setInicio(startOfYear(subYears(new Date(), 1))); setFin(lastDayOfYear(subYears(new Date(), 1)))}
    
  }, [periodo]);

  // ✅ AÑADIR: Cargar solicitudes del empleado seleccionado
useEffect(() => {
  if (!empleadoEmail) return;
  
  const unsub = loadSolicitudesVacaciones(empleadoEmail);
  
  return () => {
    if (typeof unsub === 'function') unsub();
  };
}, [empleadoEmail, loadSolicitudesVacaciones]);


  const cargar = useCallback(async () => {
    if (!empleadoEmail) return;
    setLoading(true);
    try {
      const { eventos, saldoInicial } = await getEventosSaldoUsuarioPeriodo(empleadoEmail, toYMD(inicio), toYMD(fin));
      setEventos(eventos);
      setSaldoInicial(saldoInicial);
    } finally {
      setLoading(false);
    }
  }, [empleadoEmail, inicio, fin, getEventosSaldoUsuarioPeriodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const resumen = useMemo(() => {
    if (!eventos || eventos.length === 0) {
      return { saldoInicial: saldoInicial, saldoFinal: saldoInicial, variacion: 0 };
    }
    const saldoFinal = eventos[eventos.length - 1].saldoDespues ?? saldoInicial ?? 0;
    const inicial = saldoInicial ?? saldoFinal;
    return { saldoInicial: inicial, saldoFinal, variacion: (saldoFinal - inicial) };
  }, [eventos, saldoInicial]);

  const colorChip = (tipo, delta) => {
    if (tipo === 'denegada') return 'default';
    if (tipo === 'ajuste') return delta >= 0 ? 'success' : 'error';
    return delta >= 0 ? 'success' : 'error';
  };
  const IconoDelta = ({ delta }) => delta >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />;

  // Logo para PDF
  const loadLogo = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      resolve({ dataUrl, w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

  const exportarPDF = async () => {
    const nbDate = (s) => String(s).replace(/(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+(\d{4})/g, '$1\u00A0$2\u00A0$3');
    const chunk = (arr, size) => arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
    const formatFechasBloques = (fechas, porLinea = 4) => {
      if (!Array.isArray(fechas) || fechas.length === 0) return '-';
      const fmt = fechas.map(d => nbDate(formatearFechaCorta(d)));
      return chunk(fmt, porLinea).map(gr => gr.join(', ')).join('\n');
    };

    const emp = empleados.find(e => e.email === empleadoEmail);
    const nombreEmp = emp?.nombre || empleadoEmail;

    const MARGIN = { right: 8, left: 8 };
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    const logoInfo = await loadLogo('/logo.png');
    let yStart = 34;
    if (logoInfo) {
      const { dataUrl, w, h } = logoInfo;
      const logoW = 30;
      const logoH = (h / w) * logoW;
      const xLogo = pageW - MARGIN.right - logoW;
      const yLogo = 2;
      doc.addImage(dataUrl, 'PNG', xLogo, yLogo, logoW, logoH);
      yStart = Math.max(yStart, yLogo + logoH + 2);
    }

    doc.setFontSize(14);
    doc.text(`Evolución del saldo de vacaciones — ${nombreEmp}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Periodo: ${formatearFechaCorta(toYMD(inicio))} a ${formatearFechaCorta(toYMD(fin))}`, 14, 22);
    doc.text(`Saldo inicial: ${formatearTiempoVacasLargo(resumen.saldoInicial) ?? '-'} | Saldo final: ${formatearTiempoVacasLargo(resumen.saldoFinal) ?? '-'} | Variación: ${resumen.variacion >= 0 ? '+' : '-'}${formatearTiempoVacasLargo(Math.abs(resumen.variacion))}`, 14, 28);

    const rows = (eventos || []).map(e => {
      const adminShort = e.comentariosAdmin ? String(e.comentariosAdmin).trim() : '-';
      const fechasSolicFmt = formatFechasBloques(e.fechasSolicitadas, 4);
      const fechasCancFmt = formatFechasBloques(e.fechasCanceladas, 4);
      const detalle = e.tipo === 'ajuste'
        ? (adminShort)
        : e.esVenta ? ('Venta de vacaciones')
        : (['aprobacion','denegada'].includes(e.tipo) ? fechasSolicFmt : fechasCancFmt);
      const saldoAntesTxt = typeof e.saldoAntes === 'number' ? formatearTiempoVacas(e.saldoAntes) : '-';
      const saldoDespuesTxt = typeof e.saldoDespues === 'number' ? formatearTiempoVacas(e.saldoDespues) : '-';
      return [
        formatearFechaCorta(e.fecha),
        e.concepto || '',
        formatearTiempoVacas(Math.abs(e.deltaHoras === 0 ? e.horasSolicitadas : e.deltaHoras)),
        detalle,
        saldoAntesTxt,
        saldoDespuesTxt,
      ];
    });

    autoTable(doc, {
      startY: yStart,
      margin: MARGIN,
      head: [['Fecha', 'Concepto', 'Pedido', 'Fechas/Detalle', 'Saldo antes', 'Saldo después']],
      headStyles: { halign: 'center', valign: 'middle', fillColor: [33, 150, 243] },
      body: rows,
      styles: { fontSize: 9, overflow: 'linebreak', valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 36, halign: 'center' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 91, halign: 'center' },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 17, halign: 'center' },
      },
    });

    doc.save(`saldo_${nombreEmp}_${formatearFechaCorta(toYMD(inicio))}_${formatearFechaCorta(toYMD(fin))}.pdf`);
  };

  const toggle = (k) => setExpanded((s) => ({ ...s, [k]: !s[k] }));

  const controlesDeshabilitados = !empleadoEmail;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #ec5858ff 0%, #e03535ff 50%, #c23636ff 100%)',
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

          
          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
              }}
            >
              Evolucion de Saldos
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Estado actual de las vacaciones
            </Typography>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
            <TrendingDownIcon sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ pb: 3 }}>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            {/* Selector de empleado */}
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth disabled={loading}>
                <InputLabel>Empleado</InputLabel>
                <Select
                  label="Empleado"
                  value={empleadoEmail}
                  onChange={(e) => setEmpleadoEmail(e.target.value)}
                >
                  {empleados.map(emp => (
                    <MenuItem key={emp.email} value={emp.email}>
                      {emp.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Selector de periodo */}
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth disabled={controlesDeshabilitados}>
                <InputLabel>Periodo</InputLabel>
                <Select
                  label="Periodo"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                >
                  <MenuItem value="3m">Últimos 3 meses</MenuItem>
                  <MenuItem value="6m">Últimos 6 meses</MenuItem>
                  <MenuItem value="year">Año actual</MenuItem>
                  <MenuItem value="pastyear">Año pasado</MenuItem>
                  <MenuItem value="custom">Personalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {periodo === 'custom' && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Desde"
                    value={inicio}
                    onChange={(v) => v && setInicio(v)}
                    format="dd/MM/yyyy"
                    disabled={controlesDeshabilitados}
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Hasta"
                    value={fin}
                    onChange={(v) => v && setFin(v)}
                    format="dd/MM/yyyy"
                    disabled={controlesDeshabilitados}
                    sx={{ width: '100%' }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        <Box sx={{ mt: 2 }}>
            
              {eventos.length === 0 ? (
                <Card variant="outlined"><CardContent>
                  <Typography variant="body2">No hay eventos en este periodo</Typography>
                </CardContent></Card>
              ) : (
            <Grid size={{ xs: 12 }}>
              <Box display="flex" gap={1} justifyContent='space-between' alignItems="center" flexWrap="wrap" sx={{mb:2}}>
                <Box display='flex' flexDirection='column' alignItems='center'>
                <Typography fontSize='1.2rem'>Saldo Inicial</Typography> 
                <Typography fontSize='1.2rem' fontWeight={600}>{formatearTiempoVacasLargo(resumen.saldoInicial)}</Typography>
                </Box>
                <Box display='flex' flexDirection='column' alignItems='center'>
                <Typography fontSize='1.2rem'>Saldo Final</Typography> 
                <Typography fontSize='1.2rem' fontWeight={600}>{formatearTiempoVacasLargo(resumen.saldoFinal)}</Typography>
                </Box>
              </Box>
              <Box display="flex" gap={1} justifyContent='space-between' alignItems="center" flexWrap="wrap">
                <Chip
                  sx={{fontSize:'1.2rem'}}
                  color={resumen.variacion >= 0 ? 'success' : 'error'}
                  label={`Variación: ${resumen.variacion >= 0 ? '+' : '-'}${formatearTiempoVacas(Math.abs(resumen.variacion))}`}
                />
                <Box flexGrow={1} />
                <Button sx={{p:1}} variant="outlined" size="small" startIcon={<PictureAsPdfIcon />} onClick={exportarPDF}>
                  <Typography fontSize={'1.2rem'}>
                    PDF
                  </Typography>
                </Button>
              </Box>
            </Grid>
           )}
           </Box>
        <Box sx={{ mt: 2 }}>
{loading ? (
  <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
) : (
  <Box display="flex" flexDirection="column" gap={1.5}>
    {eventos.map((e, idx) => {
      const esHorasSueltas=(e.horasSolicitadas<8 || Math.abs(e.deltaHoras)<8)
      const horasSolicitadas=e.horasSolicitadas
      const delta=Math.abs(e.deltaHoras)
      const key = `${e.fecha}-${e.tipo}-${idx}`;
      const abierto = !!expanded[key];
      const deltaTxt = `${e.deltaHoras >= 0 ? '+' : '-'}${formatearTiempoVacasLargo(Math.abs(e.deltaHoras))}`;
      const chipColor = e.tipo === 'denegada' ? 'default' : (e.deltaHoras >= 0 ? 'success' : 'error');
      return (
        <Card key={key} variant="outlined">
          <CardHeader
            title={
              <>
              <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="h6">
                  {formatearFechaCorta(e.fecha)}
                </Typography>
                <Typography variant="h6">
                   {formatearTiempoVacas(e.saldoAntes )?? '-'} → {formatearTiempoVacas(e.saldoDespues) ?? '-'}
                </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap" sx={{mb:2}}>
                <Typography variant="h6">
                  {e.concepto}
                </Typography>
                <Chip color={chipColor} size="small" label={<Typography fontSize='1rem'>{deltaTxt}</Typography>} />         
                </Box>
                <Box 
                  display='flex'
                  justifyContent='space-around'
                  alignItems='center' 
                  onClick={() => toggle(key)} aria-label={abierto ? 'Contraer' : 'Expandir'} 
                  bgcolor={ e.tipo === 'denegada' ? 'grey.100' 
                    : e.tipo ==='aprobacion' ? 'verde.fondo'
                    : e.tipo ==='cancelacion_parcial' ? 'naranja.fondo'
                    : e.tipo ==='cancelacion_total' ? 'rojo.fondo'
                    : e.tipo ==='ajuste' && e.tipoAjuste==="añadir" ? 'verde.fondo'
                    : e.tipo ==='ajuste' && e.tipoAjuste==="reducir" ? 'rojo.fondo'
                    : e.tipo ==='ajuste' && e.tipoAjuste==="establecer" ? 'azul.fondo'
                    : 'default'
                  } 
                  sx={{width:'100%'}}
                > 
                {abierto ? <ExpandLess sx={{fontSize:'2rem', color:'black'}}/> : <ExpandMore sx={{fontSize:'2rem', color:'black'}}/>}
                {abierto ? <ExpandLess sx={{fontSize:'2rem', color:'black'}}/> : <ExpandMore sx={{fontSize:'2rem', color:'black'}}/>}
                {abierto ? <ExpandLess sx={{fontSize:'2rem', color:'black'}}/> : <ExpandMore sx={{fontSize:'2rem', color:'black'}}/>}
                
              </Box>
              </>
            }           
          />
          <Collapse in={abierto} timeout="auto" unmountOnExit>
            <CardContent>
              {e.tipo === 'aprobacion' && (
                <>

                  {Array.isArray(e.fechasSolicitadas) && e.fechasSolicitadas.length > 0 && (
                    <Box sx={{mt:-2, border:'1px solid black', borderRadius:2, bgcolor:'verde.fondo', p:1}}>
                    
                    <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:'space-between',
                      cursor: 'pointer',                    
                    }}
                  >
                  <Typography fontWeight={600} variant="body1">Fechas Solicitadas: </Typography>                    
                  </Box>
                      <Box sx={{  }}>
                      {e.fechasSolicitadas.map(fecha=>{
                        return (
                          <Typography 
                            key={fecha} 
                            variant='body1' 
                            sx={{ 
                              mb: 0.5,
                            }}
                          >
                            • {formatearFechaEspanol2(fecha)} {esHorasSueltas &&`(${horasSolicitadas} ${horasSolicitadas===1?'hora':'horas'})`}
                          </Typography>)
                      })}
                      </Box>
                    </Box>
                  )}
                  {e.comentariosSolicitante && (
                  <Box sx={{border:'1px solid black', borderRadius:2, bgcolor:'verde.fondo', p:1, mt:1}}>
                    <Typography variant="body1"><strong>Comentario trabajador:</strong><br/>{e.comentariosSolicitante}</Typography>
                    </Box>
                  )}
                  {e.comentariosAdmin && (
                    <Box sx={{border:'1px solid black', borderRadius:2, bgcolor:'verde.fondo', p:1, mt:1}}>
                    <Typography variant="body1"><strong>Comentario admin:</strong><br/>{e.comentariosAdmin}</Typography>
                    </Box>
                  )}
                </>
              )}
              {e.tipo === 'cancelacion_parcial' && (
                <>
                  {Array.isArray(e.fechasCanceladas) && e.fechasCanceladas.length > 0 && (
                     <Box sx={{mt:-2, border:'1px solid black', borderRadius:2, bgcolor:'naranja.fondo', p:1}}>
                    
                    <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:'space-between',
                      cursor: 'pointer',                    
                    }}
                  >
                  <Typography fontWeight={600} variant="body1">{e.fechasCanceladas?.length===1?'Fecha Cancelada':'Fechas Canceladas'}</Typography>                    
                  </Box>
                      <Box sx={{ }}>
                      {e.fechasCanceladas.map(fecha=>{
                        return (
                          <Typography 
                            key={fecha} 
                            variant='body1' 
                            sx={{ 
                              mb: 0.5,
                            }}
                          >
                            • {formatearFechaEspanol2(fecha)} 
                          </Typography>)
                      })}
                      </Box>
                    </Box>
                  )}
                  {e.motivoCancelacion && (
                    <Box sx={{border:'1px solid black', borderRadius:2, bgcolor:'naranja.fondo', p:1, mt:1}}>
                    <Typography variant="body1"><strong>Motivo cancelación:</strong><br/>{e.motivoCancelacion}</Typography>
                    </Box>
                  )}
                </>
              )}
              {e.tipo === 'cancelacion_total' && (
                <>
                  {Array.isArray(e.fechasCanceladas) && e.fechasCanceladas.length > 0 && (
                    <Box sx={{mt:-2, border:'1px solid black', borderRadius:2, bgcolor:'rojo.fondo', p:1}}>
                    
                    <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:'space-between',
                      cursor: 'pointer',                    
                    }}
                  >
                  <Typography fontWeight={600} variant="body1">{e.fechasCanceladas?.length===1?'Fecha Cancelada':'Fechas Canceladas'}</Typography>                    
                  </Box>
                      <Box sx={{ }}>
                      {e.fechasCanceladas.map(fecha=>{
                        return (
                          <Typography 
                            key={fecha} 
                            variant='body1' 
                            sx={{ 
                              mb: 0.5,
                            }}
                          >
                            • {formatearFechaEspanol2(fecha)} {esHorasSueltas &&`(${delta} ${delta===1?'hora':'horas'})`}
                          </Typography>)
                      })}
                      </Box>
                    </Box>
                  )}
                  {e.motivoCancelacion && (
                    <Box sx={{border:'1px solid black', borderRadius:2, bgcolor:'rojo.fondo', p:1, mt:1}}>
                    <Typography variant="body1"><strong>Motivo cancelación:</strong><br/>{e.motivoCancelacion}</Typography>
                    </Box>
                  )}
                </>
              )}
              {e.tipo === 'ajuste' && (
                <>
                <Box sx={{mt:-2, border:'1px solid black', borderRadius:2, p:1, bgcolor:e.tipoAjuste==="añadir"
                                                                            ?'verde.fondo'
                                                                            :e.tipoAjuste==="reducir"
                                                                              ?'rojo.fondo'
                                                                              :'azul.fondo'
                  }}>
                  {e.comentariosSolicitante && (
                    <Typography variant="body1">{e.comentariosSolicitante}</Typography>
                  )}
                  </Box>
                  <Box sx={{border:'1px solid black', borderRadius:2, p:1, mt:1, bgcolor:e.tipoAjuste==="añadir"
                                                                            ?'verde.fondo'
                                                                            :e.tipoAjuste==="reducir"
                                                                              ?'rojo.fondo'
                                                                              :'azul.fondo'}}>
                  {e.comentariosAdmin && (
                    <Typography variant="body1" sx={{whiteSpace:'pre-wrap'}}>{e.comentariosAdmin}</Typography>
                  )}
                </Box>
                </>
              )}
              {e.tipo === 'denegada' && (
                <>
                  {Array.isArray(e.fechasSolicitadas) && e.fechasSolicitadas.length > 0 && (
                    <Box sx={{mt:-2, border:'1px solid black', borderRadius:2, bgcolor:'azul.fondo', p:1}}>
                    
                    <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:'space-between',
                      cursor: 'pointer',                    
                    }}
                  >
                  <Typography fontWeight={600} variant="body1">Fechas Denegadas: </Typography>                    
                  </Box>
                      <Box sx={{ }}>
                      {e.fechasSolicitadas.map(fecha=>{
                        return (
                          <Typography 
                            key={fecha} 
                            variant='body1' 
                            sx={{ 
                              mb: 0.5,
                            }}
                          >
                            • {formatearFechaEspanol2(fecha)} {esHorasSueltas &&`(${horasSolicitadas} ${horasSolicitadas===1?'hora':'horas'})`}
                          </Typography>)
                      })}
                      </Box>
                    </Box>
                  )}
                  {e.comentariosSolicitante && (
                    <Box sx={{border:'1px solid black', borderRadius:2, bgcolor:'verde.fondo', p:1, mt:1}}>
                    <Typography variant="body1"><strong>Comentario trabajador:</strong><br/>{e.comentariosSolicitante}</Typography>
                    </Box>
                  )}
                  {e.comentariosAdmin && (
                    <Box sx={{border:'1px solid black', borderRadius:2, bgcolor:'rojo.fondo', p:1, mt:1}}>
                    <Typography variant="body1"><strong>Comentario admin:</strong><br/>{e.comentariosAdmin}</Typography>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Collapse>
        </Card>
      );
    })}
  </Box>
)}
        </Box>
      </Container>
    </LocalizationProvider>
  );
}
