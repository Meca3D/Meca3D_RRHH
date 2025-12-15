import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Container, Box, Grid, Card, CardContent, CardHeader, Collapse,
  IconButton, Chip, Divider, Button, CircularProgress, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
 import { format, parse, isValid, addMonths, startOfYear,subYears, lastDayOfYear  } from 'date-fns'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';

import { useAuthStore } from '../../stores/authStore';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import { formatearFechaCorta, formatearFechaEspanol2, formatearFechaLarga } from '../../utils/dateUtils';
import { formatearTiempoVacas, formatearTiempoVacasLargo } from '../../utils/vacacionesUtils';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'

const toYMD = (d) => {
  if (!d) return '';
  // Date válida
  if (d instanceof Date && isValid(d)) return format(d, 'yyyy-MM-dd');
  // Firestore Timestamp u objeto con toDate()
  if (d && typeof d.toDate === 'function') {
    const dd = d.toDate();
    return isValid(dd) ? format(dd, 'yyyy-MM-dd') : '';
  }
  // String 'yyyy-MM-dd'
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  // String 'dd/MM/yyyy'
  if (typeof d === 'string') {
    const parsed = parse(d, 'dd/MM/yyyy', new Date());
    return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : '';
  }
  return '';
};

export default function MiSaldoVacaciones() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const loadSolicitudesVacaciones = useVacacionesStore(s => s.loadSolicitudesVacaciones);

  const getEventosSaldoUsuarioPeriodo = useVacacionesStore(s => s.getEventosSaldoUsuarioPeriodo);
  const [expanded, setExpanded] = useState({});
  const [periodo, setPeriodo] = useState('year'); // '3m' | '6m' | 'year' | 'custom'
  const [inicio, setInicio] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); d.setHours(0,0,0,0); return d; });
  const [fin, setFin] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [loading, setLoading] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [saldoInicial, setSaldoInicial] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    const unsub = loadSolicitudesVacaciones(user.email);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [user?.email, loadSolicitudesVacaciones]);

  // Ajuste de fechas cuando cambia el periodo
  useEffect(() => {
    if (periodo === '3m') { const hoy = new Date(); setInicio(addMonths(hoy, -3)); setFin(hoy); 
    } else if (periodo === '6m') { const hoy = new Date(); setInicio(addMonths(hoy, -6)); setFin(hoy); 
    } else if (periodo === 'year') { setInicio(startOfYear(new Date())); setFin(new Date());      
    } else if (periodo === 'pastyear') {setInicio(startOfYear(subYears(new Date(), 1))); setFin(lastDayOfYear(subYears(new Date(), 1)))}
  }, [periodo]);

  const cargar = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const { eventos, saldoInicial } = await getEventosSaldoUsuarioPeriodo(user.email, toYMD(inicio), toYMD(fin))
      setEventos(eventos);
      setSaldoInicial(saldoInicial);
    } finally {
      setLoading(false);
    }
  }, [user?.email, inicio, fin, getEventosSaldoUsuarioPeriodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const resumen = useMemo(() => {
    if (!eventos || eventos.length === 0) {
      return { saldoInicial: saldoInicial, saldoFinal: saldoInicial, variacion: 0 };
    }
    const saldoFinal = eventos[eventos.length - 1].saldoDespues ?? saldoInicial ?? 0;
    const inicial = saldoInicial ?? saldoFinal;
    return { saldoInicial: inicial, saldoFinal, variacion: (saldoFinal - inicial) };
  }, [eventos, saldoInicial]);

    const IconoDelta = ({ delta }) => delta >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />;

    const loadLogo = (src) => new Promise((resolve, reject) => {
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
    img.onerror = () => resolve(null)
    img.src = src;
  });

  const exportarPDF = async () =>  {
    const nbDate = (s) => String(s).replace(/(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+(\d{4})/g, '$1\u00A0$2\u00A0$3');
    const chunk = (arr, size) => arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
    const formatFechasBloques = (fechas, porLinea = 4) => {
    if (!Array.isArray(fechas) || fechas.length === 0) return '-';
    const fmt = fechas.map(d => nbDate(formatearFechaCorta(d)));
    return chunk(fmt, porLinea).map(gr => gr.join(', ')).join('\n'); // saltos explícitos entre bloques
  };
    const MARGIN = { right: 8, left: 8 };
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const logoInfo = await loadLogo('/logo.png');
    let yStart = 34; // valor por defecto si no hay logo
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
    doc.text('Evolución del saldo de vacaciones', 14, 16);
    doc.setFontSize(10);
    doc.text(`Periodo: ${formatearFechaCorta(toYMD(inicio))} a ${formatearFechaCorta(toYMD(fin))}`, 14, 22);
    doc.text(`Saldo inicial: ${formatearTiempoVacasLargo(resumen.saldoInicial) ?? '-'}  |  Saldo final: ${formatearTiempoVacasLargo(resumen.saldoFinal) ?? '-'}  |  Variación: ${resumen.variacion >= 0 ? '+' : '-'}${formatearTiempoVacasLargo(Math.abs(resumen.variacion))} `, 14, 28);

    const rows = (eventos || []).map(e => {
    const adminShort = e.comentariosAdmin ? String(e.comentariosAdmin).trim() : '-';
    const fechasSolicFmt = formatFechasBloques(e.fechasSolicitadas, 4);
    const fechasCancFmt  = formatFechasBloques(e.fechasCanceladas, 4);

    const detalle = e.tipo === 'ajuste'
      ? (adminShort || '-')
      : e.esVenta ? ('Venta de vacaciones')
      : (['aprobacion','denegada'].includes(e.tipo) ? fechasSolicFmt : fechasCancFmt);

    const saldoAntesTxt   = typeof e.saldoAntes === 'number'   ? formatearTiempoVacas(e.saldoAntes)   : '-';
    const saldoDespuesTxt = typeof e.saldoDespues === 'number' ? formatearTiempoVacas(e.saldoDespues) : '-';


  return [
    formatearFechaCorta(e.fecha),
    e.concepto || '',
    formatearTiempoVacas(Math.abs(e.deltaHoras===0?e.horasSolicitadas:e.deltaHoras)),
    detalle,
    saldoAntesTxt,
    saldoDespuesTxt,
  ];
});

autoTable(doc, {
  startY: yStart,
  margin: MARGIN,
  head: [['Fecha', 'Concepto', 'Pedido', 'Fechas/Detalle', 'Saldo antes', 'Saldo después']],
  headStyles: { halign: 'center', valign: 'middle', fillColor: [33, 150, 243]  }, 
  body: rows,
  styles: { fontSize: 9, overflow: 'linebreak',valign: 'middle' }, // respeta '\n' y corta por espacios
  columnStyles: {
    0: { cellWidth: 20, halign: 'center'},  // Fecha
    1: { cellWidth: 36, halign: 'center' },  // Concepto
    2: { cellWidth: 15, halign: 'center'},  // Delta
    3: { cellWidth: 91, halign: 'center'},  // Fechas/Detalle (más ancho -> caben 4 fechas por línea)
    4: { cellWidth: 15, halign: 'center' }, // Saldo antes
    5: { cellWidth: 17, halign: 'center' }, // Saldo después
  },
});

    doc.save(`saldo_vacaciones_${formatearFechaCorta(toYMD(inicio))}_${formatearFechaCorta(toYMD(fin))}.pdf`);
  };

  const toggle = (k) => setExpanded((s) => ({ ...s, [k]: !s[k] }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #6D3B07 0%, #4A2505 50%, #2D1603 100%)',
          boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/vacaciones')}
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
              Mi saldo
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Estado actual de tus vacaciones
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
          <Card sx={{p:2, my:2, border:'2px solid', borderColor:'primary.main', boxShadow: '0 4px 20px rgba(76, 76, 142, 0.3)' }}>
            <Typography variant='h6' sx={{mb:2, mt:1, textAlign:'center', fontWeight:'bold'}}>
              Seleccione Periodo a Visualizar

            </Typography>
            <Grid size={{ xs: 12 }}>
              <FormControl sx={{mb:2}} fullWidth>
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
                    sx={{width:'100%'}}
                    
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Hasta"
                    value={fin} 
                    onChange={(v) => v && setFin(v)} 
                    format="dd/MM/yyyy"
                    sx={{width:'100%'}}
                    
                  />
                </Grid>
              </>
            )}
           {eventos.length > 0 && (

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
                  label={`Variación:  ${resumen.variacion >= 0 ? '+' : '-'}${formatearTiempoVacas(Math.abs(resumen.variacion))}`}
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
          </Card>
        </Box>

        <Box sx={{ mt: 2 }}>
{loading ? (
  <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
) : (
  <Box display="flex" flexDirection="column" gap={1.5}>
    {eventos.length === 0 && (
        <Card sx={{p:1}}>       
              <Typography textAlign='center' variant="body1">No hay eventos en este periodo</Typography>
          </Card>
    )}

    {eventos.length >0 && 
      <Typography variant="h6" sx={{mt:2, mb:-1, textAlign:'center', fontWeight:'bold'}}>
        EVOLUCION DEL SALDO
      </Typography>
  }

    {eventos.map((e, idx) => {
      const esHorasSueltas=(e.horasSolicitadas<8 || Math.abs(e.deltaHoras)<8)
      const horasSolicitadas=e.horasSolicitadas
      const delta=Math.abs(e.deltaHoras)
      const key = `${e.fecha}-${e.tipo}-${idx}`;
      const abierto = !!expanded[key];
      const deltaTxt = `${e.deltaHoras >= 0 ? '+' : '-'}${formatearTiempoVacasLargo(Math.abs(e.deltaHoras))}`;
      const chipColor = (e.deltaHoras > 0 ? 'success' : e.deltaHoras < 0 ? 'error' : 'default');
      const getColor = (e) => ( e.tipo === 'denegada' ? 'rojo.main' 
                              : e.tipo ==='aprobacion' ? 'verde.main'
                              : e.tipo ==='ampliacion' ? 'verde.main'
                              : e.tipo ==='cancelacion_parcial' ? 'naranja.main'
                              : e.tipo ==='cancelacion_total' ? 'dorado.main'
                              : e.tipo ==='ajuste' && e.tipoAjuste==="añadir" ? 'verde.main'
                              : e.tipo ==='ajuste' && e.tipoAjuste==="reducir" ? 'rojo.main'
                              : e.tipo ==='ajuste' && e.tipoAjuste==="establecer" ? 'azul.main'
                              : 'default')
      const getFondo = (e) => (e.tipo === 'denegada' ? 'grey.100' 
                              : e.tipo ==='aprobacion' ? 'verde.fondo'
                              : e.tipo ==='ampliacion' ? 'verde.fondo'
                              : e.tipo ==='cancelacion_parcial' ? 'naranja.fondo'
                              : e.tipo ==='cancelacion_total' ? 'dorado.fondo'
                              : e.tipo ==='ajuste' && e.tipoAjuste==="añadir" ? 'verde.fondo'
                              : e.tipo ==='ajuste' && e.tipoAjuste==="reducir" ? 'rojo.fondo'
                              : e.tipo ==='ajuste' && e.tipoAjuste==="establecer" ? 'azul.fondo'
                              : 'default')
      
      return (
        <Card elevation={5} key={key} sx={{border:'1px solid black'}} onClick={() => toggle(key)} aria-label={abierto ? 'Contraer' : 'Expandir'} >
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
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap" sx={{}}>
                <Typography variant="h6">
                  {(e.esVenta&&e.tipo === 'cancelacion_total')?'Venta Cancelada':e.concepto}
                </Typography>
                <Chip color={chipColor} size="small" label={<Typography fontSize='1rem'>{deltaTxt}</Typography>} />
                
              </Box>
              </>
            }           
          />
          <Collapse in={abierto} timeout="auto" unmountOnExit>
            <CardContent sx={{mt:-2}}>
              <Box sx={{
                          p: 2,                 
                          bgcolor: getFondo(e)  ,
                          borderLeft: '4px solid',
                          borderColor: getColor(e),
                          borderRadius:2
                        }}>
              {e.tipo === 'aprobacion' && (
                <>
                
                  {Array.isArray(e.fechasSolicitadas) && e.fechasSolicitadas.length > 0 && (
                    <Box>
                        <Typography fontWeight={600} variant="body1" sx={{textAlign:'center'}}>
                        {e.fechasSolicitadas.length === 1 ? 'Día Solicitado':'Días Solicitados'} 
                        </Typography>               
                     {e.fechasSolicitadas.length === 1 ? (
                         <Grid size={{ xs: 12 }}> 
                         <Box  sx={{
                            display: 'flex',
                            justifyContent:esHorasSueltas?'space-between':'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            p: 1,   
                            border:'1px solid',
                            bgcolor:'white',
                            borderColor: getColor(e),
                            borderRadius: 2,
                                }}>                    
                                <Typography fontSize={'1.1rem'}>
                                  {formatearFechaLarga(e.fechasSolicitadas[0])}
                                </Typography>
                                {esHorasSueltas&& (
                                  <Chip
                                    label ={formatearTiempoVacasLargo(horasSolicitadas)}
                                    size="small"
                                          sx={{ 
                                            py:0.5,               
                                            bgcolor: getColor(e), 
                                            color: 'white', 
                                            fontWeight: 700,
                                          }}
                                        />
                                )}
                                </Box>
                                </Grid>
                              ) : (
                        <Grid container sx={{mt:1,}} spacing={0.5}>
                        {e.fechasSolicitadas.map(fecha=> (
                        <Grid size={{xs:6,md:4}} key={fecha}>
                          <Box sx={{textAlign:'center', mb: 0.5,}}>
                            <Chip                             
                              label={formatearFechaCorta(fecha)}
                              size="small"
                              variant='outlined'
                              sx={{
                                fontSize: '0.95rem',
                                p:0.5,
                                bgcolor: 'white',
                                color: getColor(e),
                                borderColor: getColor(e),
                                fontWeight: 600
                              }}
                            />
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                              )}
                    </Box>
                  )}

                  {e.esVenta && (
                      <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body2" display="block" fontWeight={600}>
                          💵 Venta de Vacaciones:
                        </Typography>
                        <Box display='flex' justifyContent={e?.cantidadARecibir?'space-between':'left'}>
                          <Typography variant="body1" fontStyle='italic'>
                            Venta de {formatearTiempoVacasLargo(e.horasSolicitadas)}
                          </Typography>
                          {e?.cantidadARecibir &&(
                            <Typography variant="body1" fontStyle='italic'>
                            por: {e.cantidadARecibir}€
                          </Typography>
                          )}
                        </Box>
                      </Box>
                  )}

                  {e.comentariosSolicitante && (
                      <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body2" display="block" fontWeight={600}>
                          💬 Tus comentarios:
                        </Typography>
                        <Typography variant="body1" fontStyle='italic'>
                          "{e.comentariosSolicitante}"
                        </Typography>
                      </Box>
                  )}
                  {e.comentariosAdmin && (
                      <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body2" display="block" fontWeight={600}>
                          👨‍💼 Respuesta de administración:
                        </Typography>
                        <Typography variant="body1" fontStyle='italic' sx={{ whiteSpace: 'pre-wrap' }}>
                          "{e.comentariosAdmin}"
                        </Typography>
                      </Box>
                  )}
                </>
              )}
              {(e.tipo === 'cancelacion_parcial'||e.tipo === 'cancelacion_total') && (
                <>
                {Array.isArray(e.fechasCanceladas) && e.fechasCanceladas.length > 0 && (
                    <Box>
                        <Typography fontWeight={600} variant="body1" sx={{textAlign:'center'}}>
                        {e.fechasCanceladas.length === 1 ? 'Día Cancelado':'Días Cancelados'} 
                        </Typography>               
                     {e.fechasCanceladas.length === 1 ? (
                         <Grid size={{ xs: 12 }}> 
                         <Box  sx={{
                            display: 'flex',
                            justifyContent:esHorasSueltas?'space-between':'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            p: 1,   
                            border:'1px solid',
                            bgcolor:'white',
                            borderColor: getColor(e),
                            borderRadius: 2,
                                }}>                    
                                <Typography fontSize={'1.1rem'}>
                                  {formatearFechaLarga(e.fechasCanceladas[0])}
                                </Typography>
                                {esHorasSueltas&& (
                                  <Chip
                                    label ={formatearTiempoVacasLargo(e.horasDevueltas)}
                                    size="small"
                                          sx={{ 
                                            py:0.5,               
                                            bgcolor: getColor(e), 
                                            color: 'white', 
                                            fontWeight: 700,
                                          }}
                                        />
                                )}
                                </Box>
                                </Grid>
                              ) : (
                        <Grid container sx={{mt:1,}} spacing={0.5}>
                        {e.fechasCanceladas.map(fecha=> (
                        <Grid size={{xs:6,md:4}} key={fecha}>
                          <Box sx={{textAlign:'center', mb: 0.5,}}>
                            <Chip                             
                              label={formatearFechaCorta(fecha)}
                              size="small"
                              variant='outlined'
                              sx={{
                                fontSize: '1rem',
                                p:0.5,
                                bgcolor: 'white',
                                color: getColor(e),
                                borderColor: getColor(e),
                                fontWeight: 600
                              }}
                            />
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                              )}
                    </Box>
                  )}

                  {e.esVenta && (
                      <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body2" display="block" fontWeight={600}>
                          💵 Venta de Vacaciones: 
                        </Typography>
                        <Box display='flex' justifyContent='space-between'>
                          <Typography variant="body1" fontStyle='italic'>
                            Venta de {formatearTiempoVacasLargo(e.horasSolicitadas)}
                          </Typography>
                          <Typography variant="body1" fontStyle='italic'>
                          ❌
                        </Typography>                        
                        </Box>
                      </Box>
                  )}
                  {e.motivoCancelacion && (

                    <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body2" display="block" fontWeight={600}>
                          💬 Motivo de Cancelación:
                        </Typography>
                        <Typography variant="body1" fontStyle='italic' sx={{ whiteSpace: 'pre-wrap' }}>
                          "{e.motivoCancelacion}"
                        </Typography>
                      </Box>
                  )}
                  <Box display="flex" justifyContent='space-between' alignItems="center" mt={0.5}>
                    <Typography variant="body2" color="">
                      Cancelado por:
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="">
                      {e.procesadaPor}
                    </Typography>
                  </Box>
                </>
              )}

               {e.tipo === 'ampliacion' && (
                <>
                {Array.isArray(e.fechasCanceladas) && e.fechasCanceladas.length > 0 && (
                    <Box>
                        <Typography fontWeight={600} variant="body1" sx={{textAlign:'center'}}>
                        {e.fechasCanceladas.length === 1 ? 'Día Cancelado':'Días Cancelados'} 
                        </Typography>               
                     {e.fechasCanceladas.length === 1 ? (
                         <Grid size={{ xs: 12 }}> 
                         <Box  sx={{
                            display: 'flex',
                            justifyContent:esHorasSueltas?'space-between':'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            p: 1,   
                            border:'1px solid',
                            bgcolor:'white',
                            borderColor: getColor(e),
                            borderRadius: 2,
                                }}>                    
                                <Typography fontSize={'1.1rem'}>
                                  {formatearFechaLarga(e.fechasCanceladas[0])}
                                </Typography>
                                {esHorasSueltas&& (
                                  <Chip
                                    label ={formatearTiempoVacasLargo(e.horasDevueltas)}
                                    size="small"
                                          sx={{ 
                                            py:0.5,               
                                            bgcolor: getColor(e), 
                                            color: 'white', 
                                            fontWeight: 700,
                                          }}
                                        />
                                )}
                                </Box>
                                </Grid>
                              ) : (
                        <Grid container sx={{mt:1,}} spacing={0.5}>
                        {e.fechasCanceladas.map(fecha=> (
                        <Grid size={{xs:6,md:4}} key={fecha}>
                          <Box sx={{textAlign:'center', mb: 0.5,}}>
                            <Chip                             
                              label={formatearFechaCorta(fecha)}
                              size="small"
                              variant='outlined'
                              sx={{
                                fontSize: '1rem',
                                p:0.5,
                                bgcolor: 'white',
                                color: getColor(e),
                                borderColor: getColor(e),
                                fontWeight: 600
                              }}
                            />
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                              )}
                    </Box>
                  )}

                  {e.esVenta && (
                      <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body2" display="block" fontWeight={600}>
                          💵 Venta de Vacaciones: 
                        </Typography>
                        <Box display='flex' justifyContent='space-between'>
                          <Typography variant="body1" fontStyle='italic'>
                            Venta de {formatearTiempoVacasLargo(e.horasSolicitadas)}
                          </Typography>
                          <Typography variant="body1" fontStyle='italic'>
                          ❌
                        </Typography>                        
                        </Box>
                      </Box>
                  )}
                  {e.motivoCancelacion && (

                    <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body2" display="block" fontWeight={600}>
                          💬 Motivo de Cancelación:
                        </Typography>
                        <Typography variant="body1" fontStyle='italic' sx={{ whiteSpace: 'pre-wrap' }}>
                          "{e.motivoCancelacion}"
                        </Typography>
                      </Box>
                  )}
                  <Box display="flex" justifyContent='space-between' alignItems="center" mt={0.5}>
                    <Typography variant="body2" color="">
                      Cancelado por:
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="">
                      {e.procesadaPor}
                    </Typography>
                  </Box>
                </>
              )}

              {e.tipo === 'ajuste' && (
                <>
                  {e.comentariosSolicitante && (
                      <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body1" display="block" fontWeight={600}>
                          {e.comentariosSolicitante}
                        </Typography>
                      </Box>
                  )}

                  {e.comentariosAdmin && (
                    <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                      <Typography variant="body1" fontStyle='italic' sx={{ whiteSpace: 'pre-wrap' }}>
                        "{e.comentariosAdmin}"
                      </Typography>
                    </Box>
                  )}
                </>
              )}
              {e.tipo === 'denegada' && (
                <>
                                
                  {Array.isArray(e.fechasSolicitadas) && e.fechasSolicitadas.length > 0 && (
                    <Box>
                        <Typography fontWeight={600} variant="body1" sx={{textAlign:'center'}}>
                        {e.fechasSolicitadas.length === 1 ? 'Día Denegado':'Días Denegados'} 
                        </Typography>               
                     {e.fechasSolicitadas.length === 1 ? (
                         <Grid size={{ xs: 12 }}> 
                         <Box  sx={{
                            display: 'flex',
                            justifyContent:esHorasSueltas?'space-between':'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            p: 1,   
                            border:'1px solid',
                            bgcolor:'white',
                            borderColor: getColor(e),
                            borderRadius: 2,
                                }}>                    
                                <Typography fontSize={'1.1rem'}>
                                  {formatearFechaLarga(e.fechasSolicitadas[0])}
                                </Typography>
                                {esHorasSueltas&& (
                                  <Chip
                                    label ={formatearTiempoVacasLargo(horasSolicitadas)}
                                    size="small"
                                          sx={{ 
                                            py:0.5,               
                                            bgcolor: getColor(e), 
                                            color: 'white', 
                                            fontWeight: 700,
                                          }}
                                        />
                                )}
                                </Box>
                                </Grid>
                              ) : (
                        <Grid container sx={{mt:1,}} spacing={0.5}>
                        {e.fechasSolicitadas.map(fecha=> (
                        <Grid size={{xs:6,md:4}} key={fecha}>
                          <Box sx={{textAlign:'center', mb: 0.5,}}>
                            <Chip                             
                              label={formatearFechaCorta(fecha)}
                              size="small"
                              variant='outlined'
                              sx={{
                                fontSize: '0.95rem',
                                p:0.5,
                                bgcolor: 'white',
                                color: getColor(e),
                                borderColor: getColor(e),
                                fontWeight: 600
                              }}
                            />
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                              )}
                    </Box>
                  )}

                  {e.esVenta && (
                      <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body2" display="block" fontWeight={600}>
                          💵 Venta de Vacaciones:
                        </Typography>
                        <Box display='flex' justifyContent={'space-between'}>
                          <Typography variant="body1" fontStyle='italic'>
                            Venta de {formatearTiempoVacasLargo(e.horasSolicitadas)}
                          </Typography>
                          <Typography variant="body1" fontStyle='italic'>
                            ❌
                          </Typography>
                        </Box>
                      </Box>
                  )}

                  {e.comentariosSolicitante && (
                      <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body2" display="block" fontWeight={600}>
                          💬 Tus comentarios:
                        </Typography>
                        <Typography variant="body1" fontStyle='italic'>
                          "{e.comentariosSolicitante}"
                        </Typography>
                      </Box>
                  )}
                  {e.comentariosAdmin && (
                      <Box sx={{ mt:1.5, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: getColor(e) }}>                                               
                        <Typography variant="body2" display="block" fontWeight={600}>
                          👨‍💼 Respuesta de administración:
                        </Typography>
                        <Typography variant="body1" fontStyle='italic' sx={{ whiteSpace: 'pre-wrap' }}>
                          "{e.comentariosAdmin}"
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
                </Box>
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
