// components/HorasExtras/EstadisticasHorasExtras.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Card, CardContent, AppBar, Toolbar,
  IconButton, Alert, CircularProgress, Chip, MenuItem, TextField, Paper
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  PieChart as PieChartIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, ComposedChart,
} from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { useHorasExtraStore } from '../../stores/horasExtraStore';
import { useNominaStore } from '../../stores/nominaStore';
import { 
  convertirHorasDecimalesAHorasYMinutos,
  tiposHorasExtra, 
  formatCurrency, 
  formatDate, 
  formatearTiempo, 
} from '../../utils/nominaUtils';

 const CustomPieChartLegend = (props) => {
  const { payload } = props;

  // Asegurarse de que payload sea un array válido antes de mapear
  const validPayload = Array.isArray(payload) ? payload : [];

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
      {validPayload.map((entry, index) => {
        const name = entry.payload.tipo; 
        const color = entry.color;

        if (!name || Math.abs(entry.value) < 0.005) { // No mostrar si no hay nombre o el valor es cero
          return null;
        }

        return (
          <li key={`legend-${index}`} style={{ display: 'inline-flex', alignItems: 'center', marginRight: '10px', marginBottom: '5px', fontSize: '0.9rem',  }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: color,
                marginRight: '5px',
                verticalAlign: 'middle',
              }}
            />
            {/* ✅ Texto en color negro */}
            <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: '500' }}>
              {name}
            </Typography>
          </li>
        );
      })}
    </ul>
  );
};

const CustomPieChartLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }) => {
  const radius = outerRadius * 1.3; // Ajusta este valor para mover el porcentaje más lejos o más cerca
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  // No mostrar la etiqueta si el porcentaje es muy pequeño para evitar superposiciones
  if (percent * 100 < 0) { // Puedes ajustar este umbral
    return null;
  }

  return (
    <text 
      x={x} 
      y={y} 
      fill="black" // ✅ Color del texto en negro
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="1rem"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

const EstadisticasHorasExtras = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { 
    horasExtra, 
    fetchHorasExtra, 
    getEstadisticasPeriodo,
    loading 
  } = useHorasExtraStore();

  const {obtenerPeriodoHorasExtras} = useNominaStore()

  // Estados para filtros y datos
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mesActual');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estadisticas, setEstadisticas] = useState(null);
  const [datosGraficos, setDatosGraficos] = useState({
    evolucionMensual: [],
    distribucionTipos: [],
    comparativaAnual: []
  });

  // ✅ Períodos preconfigurados
  const periodosPreconfigurados = [
    { value: 'mesActual', label: 'Mes Actual' },
    { value: 'mesAnterior', label: 'Mes Anterior' },
    { value: 'ultimos3meses', label: 'Últimos 3 Meses' },
    { value: 'ultimos6meses', label: 'Últimos 6 Meses' },
    { value: 'anoActual', label: 'Año Actual' },
    { value: 'anoAnterior', label: 'Año Anterior' },
    { value: 'personalizado', label: 'Período Personalizado' }
  ];

  // ✅ Calcular fechas según período seleccionado
  const calcularFechasPeriodo = async (periodo) => {
    const now = new Date();
    let inicio, fin;
    switch (periodo) {
    case 'mesActual': {
      // Buscar nómina del mes anterior
      const periodoAnterior = await obtenerPeriodoHorasExtras(user.email, 1);
      if (periodoAnterior.encontrada) {
        // Empezar el día siguiente al fin del período anterior
        const inicioNuevo = new Date(periodoAnterior.fechaFin);
        inicioNuevo.setDate(inicioNuevo.getDate() + 1).iso;
        inicio = inicioNuevo;
        fin = now;
      } else {        // Lógica actual si no hay nómina anterior
        inicio = new Date(now.getFullYear(), now.getMonth(), -7);
        fin = now;
      }
      break;
    }
      case 'mesAnterior':{
             // Cargar período exacto de la nómina anterior
      const periodoAnterior = await obtenerPeriodoHorasExtras(user.email, 1);
      if (periodoAnterior.encontrada) {
        inicio = new Date(periodoAnterior.fechaInicio);
        fin = new Date(periodoAnterior.fechaFin);
      } else {
        // Lógica actual
        inicio = new Date(now.getFullYear(), now.getMonth() - 1, -7);
        fin = new Date(now.getFullYear(), now.getMonth(), -6);
      }
      break;
    }
    case 'ultimos3meses': {
      // Empezar desde la nómina de hace 2 meses hasta ahora
      const periodoInicio = await obtenerPeriodoHorasExtras(user.email, 2);
      if (periodoInicio.encontrada) {
        inicio = new Date(periodoInicio.fechaInicio);
        fin = now;
      } else {
        inicio = new Date(now.getFullYear(), now.getMonth() - 2, -7);
        fin = now;
      }
      break;
    }

    case 'ultimos6meses': {
      // Empezar desde la nómina de hace 5 meses hasta ahora
      const periodoInicio = await obtenerPeriodoHorasExtras(user.email, 5);
      if (periodoInicio.encontrada) {
        inicio = new Date(periodoInicio.fechaInicio);
        fin = now;
      } else {
        // Lógica actual
        inicio = new Date(now.getFullYear(), now.getMonth() - 5, -7);
        fin = now;
      }
      break;
    }
      case 'anoActual':
        inicio = new Date(now.getFullYear(), 0, 1);
        fin = new Date(now.getFullYear(), 11, 31);
        break;
      case 'anoAnterior':
        inicio = new Date(now.getFullYear() - 1, 0, 1);
        fin = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        return { fechaInicio, fechaFin };
    }

    return {
      fechaInicio: inicio.toISOString().split('T')[0],
      fechaFin: fin.toISOString().split('T')[0]
    };
  };

  // ✅ Cargar datos cuando cambie el período
  useEffect(() => {
    if (!user?.email) return;


  const loadData = async () => {
    let fechas;
    if (periodoSeleccionado === 'personalizado') {
      if (!fechaInicio || !fechaFin) return;
      fechas = { fechaInicio, fechaFin };
    } else {
      // ✅ Usar nueva función inteligente
      fechas = await calcularFechasPeriodo(periodoSeleccionado);
      setFechaInicio(fechas.fechaInicio);
      setFechaFin(fechas.fechaFin);
    }

    const unsubscribe = fetchHorasExtra(user.email, fechas.fechaInicio, fechas.fechaFin);
    return unsubscribe;
  };

  loadData();
  }, [user?.email, periodoSeleccionado, fechaInicio, fechaFin]);

  // ✅ Procesar datos para gráficos cuando cambien las horas extra
  useEffect(() => {
    if (horasExtra.length === 0) {
      setEstadisticas(null);
      setDatosGraficos({ evolucionMensual: [], distribucionTipos: [], comparativaAnual: [] });
      return;
    }

    // Calcular estadísticas del período
    const stats = getEstadisticasPeriodo(horasExtra, fechaInicio, fechaFin);
    setEstadisticas(stats);

    // Procesar datos para gráficos
    procesarDatosGraficos(horasExtra);
  }, [horasExtra, fechaInicio, fechaFin]);

  const procesarDatosGraficos = (horas) => {
    // ✅ 1. Evolución mensual
    const evolucionMensual = {};
    horas.forEach(hora => {
      const mes = hora.fecha.substring(0, 7); // YYYY-MM
      if (!evolucionMensual[mes]) {
        evolucionMensual[mes] = { 
          mes, 
          horas: 0, 
          importe: 0, 
          registros: 0,
          mesFormateado: new Date(mes + '-01').toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short' 
          })
        };
      }
      const horasDecimales = hora.horasDecimales || 
        (hora.horas || 0) + ((hora.minutos || 0) / 60);
      
      evolucionMensual[mes].horas += horasDecimales;
      evolucionMensual[mes].importe += hora.importe || 0;
      evolucionMensual[mes].registros += 1;
    });

    // ✅ 2. Distribución por tipos
  const distribucionTipos = {};
  horas.forEach(hora => {
    if (!distribucionTipos[hora.tipo]) {
      const tipoInfo = tiposHorasExtra.find(t => t.value === hora.tipo);
      distribucionTipos[hora.tipo] = {
        tipo: tipoInfo?.label || hora.tipo,
        horas: 0,
        importe: 0,
        registros: 0,
        color: tipoInfo?.color || '#666'
      };
    }
    const horasDecimales = hora.horasDecimales || 
      (hora.horas || 0) + ((hora.minutos || 0) / 60);
    
    distribucionTipos[hora.tipo].horas += horasDecimales;
    distribucionTipos[hora.tipo].importe += hora.importe || 0;
    distribucionTipos[hora.tipo].registros += 1;
  });

  const distribucionOrdenada = tiposHorasExtra
    .map(tipoBase => distribucionTipos[tipoBase.value]) 
    .filter(Boolean); 

  setDatosGraficos({
    evolucionMensual: Object.values(evolucionMensual).sort((a, b) => a.mes.localeCompare(b.mes)),
    distribucionTipos: distribucionOrdenada, 
    comparativaAnual: []
  });
};

  const handlePeriodoChange = (periodo) => {
    setPeriodoSeleccionado(periodo);
    if (periodo !== 'personalizado') {
      const fechas = calcularFechasPeriodo(periodo);
      setFechaInicio(fechas.fechaInicio);
      setFechaFin(fechas.fechaFin);
    }
  };

  
  const COLORES_PIE = ['#FB8C00', '#3B82F6', '#10B981', '#EF4444', '#7B1FA2', '#F59E0B'];

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
              Estadísticas y Analytics
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Análisis de horas extra
            </Typography>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            sx={{
              cursor: 'default'
            }}
          >
            <BarChartIcon sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Contenido principal */}
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        {/* Selector de período */}
        <Card elevation={0} sx={{ mb: 3, borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{mb:2, verticalAlign: 'middle'}}>
              <CalendarIcon sx={{ mr: 1,  }} />
              Período de Análisis
            </Typography>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  label="Período"
                  value={periodoSeleccionado}
                  onChange={(e) => handlePeriodoChange(e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'verde.main'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'verde.main'
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'verde.main'
                    }
                  }}
                >
                  {periodosPreconfigurados.map((periodo) => (
                    <MenuItem key={periodo.value} value={periodo.value}>
                      {periodo.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {periodoSeleccionado === 'personalizado' && (
                <>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      type="date"
                      label="Fecha inicio"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      fullWidth
                      focused
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'verde.main'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'verde.main'
                          }
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: 'verde.main'
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      type="date"
                      label="Fecha fin"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      fullWidth
                      focused
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'verde.main'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'verde.main'
                          }
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: 'verde.main'
                        }
                      }}
                    />
                  </Grid>
                </>
              )}
            </Grid>

            {fechaInicio && fechaFin && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Analizando período:</strong> {formatDate(fechaInicio)} - {formatDate(fechaFin)}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <Box textAlign="center" p={4}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Cargando estadísticas...
            </Typography>
          </Box>
        ) : !estadisticas ? (
          <Alert severity="info">
            {!fechaInicio || !fechaFin ? 
              'Selecciona un período para ver las estadísticas' :
              'No hay datos en este período'
            }
          </Alert>
        ) : (
          <>
            {/* Métricas principales */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Card elevation={0} sx={{ 
                  textAlign: 'center', 
                  p: 2, 
                  borderRadius: 4,
                  border: '1px solid rgba(0,0,0,0.08)',
                  bgcolor: 'rgba(16, 185, 129, 0.05)'
                }}>
                  <Typography variant="h5" color="verde.main" fontWeight="bold">
                    {estadisticas.totalRegistros}
                  </Typography>
                  <Typography variant="body2">Total Registros</Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Card elevation={0} sx={{ 
                  textAlign: 'center', 
                  p: 2, 
                  borderRadius: 4,
                  border: '1px solid rgba(0,0,0,0.08)',
                  bgcolor: 'rgba(59, 130, 246, 0.05)'
                }}>
                  <Typography variant="h5" color="azul.main" fontWeight="bold">
                    {formatearTiempo(
                      Math.floor(estadisticas.totalHoras), 
                      Math.round((estadisticas.totalHoras % 1) * 60)
                    )}
                  </Typography>
                  <Typography variant="body2">Total Horas</Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={0} sx={{ 
                  textAlign: 'center', 
                  p: 3, 
                  borderRadius: 4,
                  border: '1px solid rgba(0,0,0,0.08)',
                  bgcolor: 'rgba(251, 140, 0, 0.05)'
                }}>
                  <Typography variant="h4" color="naranja.main" fontWeight="bold">
                    {formatCurrency(estadisticas.totalImporte)}
                  </Typography>
                  <Typography variant="body2">Total Importe</Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Gráficos */}
            <Grid container spacing={3}>
              {/* Evolución mensual */}
              {datosGraficos.evolucionMensual.length > 0 && (
                <Grid size={{ xs: 12, md: 8 }}>
                  <Card elevation={5} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Evolución Temporal
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart
                          data={datosGraficos.evolucionMensual}
                          margin={{
                            top: 20,
                            right: -10,
                            bottom: -10,
                            left: -10,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mesFormateado" />
                          <YAxis yAxisId="horas" orientation="left" />
                          <YAxis yAxisId="importe" orientation="right" />
                          <Tooltip 
                            formatter={(value, name) => [
                              name === 'Horas' ? `${convertirHorasDecimalesAHorasYMinutos(value)}` : formatCurrency(value),
                              name === 'Horas' ? 'Horas' : 'Importe'
                            ]}
                          />
                          <Legend 
                            verticalAlign="bottom"
                            height={50}
                          />
                          <Area 
                            yAxisId="horas"
                            type="monotone" 
                            dataKey="horas" 
                            fill="rgba(59, 130, 246, 0.3)"
                            stroke="#3B82F6"
                            name="Horas"
                          />
                          <Bar 
                            yAxisId="importe"
                            dataKey="importe" 
                            fill="#10B981"
                            name="Importe"
                            maxBarSize={20}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Distribución por tipos */}
              {datosGraficos.distribucionTipos.length > 0 && (
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <PieChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Por Tipo
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={datosGraficos.distribucionTipos}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="importe"
                            label={CustomPieChartLabel} 
                            labelLine={true} // 
                          >
                            {datosGraficos.distribucionTipos.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORES_PIE[index % COLORES_PIE.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                             <Legend 
                            layout="horizontal" 
                            align="center" 
                            verticalAlign="bottom" 
                            wrapperStyle={{ fontSize: '0.85rem' }} 
                            itemSorter={(item) => {
                                return (item.payload.importe) * -1; // Ordena de mayor a menor importe
                            }}
                            content={<CustomPieChartLegend />}
                            />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              )}

            {/* Tabla detallada por tipos */}
            {datosGraficos.distribucionTipos.length > 0 && (
            <Grid size={{ xs: 12 }}>
                <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
                <CardContent>
                    <Typography variant="h6" textAlign='center' gutterBottom>
                    Desglose detallado por Tipo
                    </Typography>
                    <Box>
                    {/* Header */}
                    <Box display="flex" p={1} fontWeight="bold" bgcolor="verde.fondo" borderRadius={2}>
                        <Typography sx={{ 
                        width: '30%', 
                        textAlign: 'center',
                        flex: 'none'
                        }}>
                        Tipo
                        </Typography>
                        <Typography sx={{ 
                        width: '40%', 
                        textAlign: 'center',
                        flex: 'none'
                        }}>
                        Tiempo
                        </Typography>
                        <Typography sx={{ 
                        width: '30%', 
                        textAlign: 'right',
                        flex: 'none'
                        }}>
                        Importe
                        </Typography>
                    </Box>

                    {datosGraficos.distribucionTipos.map((tipo, index) => (
                        <Box 
                        key={index} 
                        display="flex" 
                        alignItems="flex-start" // ✅ CLAVE: flex-start en lugar de center
                        py={1} // ✅ Padding vertical en lugar de p={1}
                        borderBottom="1px solid" 
                        borderColor="grey.200"
                        minHeight={45} // ✅ Altura mínima consistente
                        >
                        <Box sx={{ 
                            width: '30%', 
                            flex: 'none',
                            display: 'flex', 
                            alignItems: 'center', // ✅ CLAVE: flex-start aquí también
                            justifyContent: 'left', 
                            gap: 1,
                            pt: 0.5 // ✅ Pequeño padding top para alinear con el texto
                        }}>
                            <Box sx={{ 
                            width: 12, 
                            height: 12, 
                            minWidth: 12, // ✅ Ancho mínimo fijo
                            minHeight: 12, // ✅ Alto mínimo fijo
                            maxWidth: 12, // ✅ Ancho máximo fijo
                            maxHeight: 12, // ✅ Alto máximo fijo
                            bgcolor: tipo.color, 
                            borderRadius: '50%',
                            flexShrink: 0, // ✅ CLAVE: No permitir que se comprima
                            mt: 0.25 // ✅ Margen top para centrar con la primera línea de texto
                            }} />
                            <Typography 
                            sx={{ 
                                textAlign: "left",
                                lineHeight: 1.2, // ✅ Altura de línea más compacta
                                fontSize: '0.875rem' // ✅ Texto ligeramente más pequeño si es necesario
                            }}
                            >
                            {tipo.tipo}
                            </Typography>
                        </Box>

                        <Typography sx={{ 
                            width: '40%', 
                            flex: 'none',
                            textAlign: 'center',
                            alignSelf: 'center' // ✅ Centrar este texto verticalmente
                        }}>
                            {formatearTiempo(Math.floor(tipo.horas), Math.round((tipo.horas % 1) * 60))}
                        </Typography>

                        <Typography sx={{ 
                            width: '30%', 
                            flex: 'none',
                            textAlign: 'right', 
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            alignSelf: 'center' // ✅ Centrar este texto verticalmente
                        }}>
                            {formatCurrency(tipo.importe)}
                        </Typography>
                        </Box>
                    ))}

                    {/* Fila de totales */}
                    <Box 
                        display="flex" 
                        alignItems="center" 
                        py={1}
                        borderTop="2px solid" 
                        borderColor="grey.400"
                        bgcolor="rgba(16, 185, 129, 0.05)"
                    >
                        <Box sx={{ 
                        width: '30%', 
                        flex: 'none',
                        textAlign: 'center'
                        }}>
                        <Typography fontWeight="bold" color="verde.main">
                            TOTAL
                        </Typography>
                        </Box>
                        <Typography sx={{ 
                        width: '40%', 
                        flex: 'none',
                        textAlign: 'center',
                        fontWeight: 'bold'
                        }}>
                        {formatearTiempo(
                            Math.floor(estadisticas.totalHoras), 
                            Math.round((estadisticas.totalHoras % 1) * 60)
                        )}
                        </Typography>
                        <Typography sx={{ 
                        width: '30%', 
                        flex: 'none',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: 'verde.main',
                        fontFamily: 'monospace'
                        }}>
                        {formatCurrency(estadisticas.totalImporte)}
                        </Typography>
                    </Box>
                    </Box>
                </CardContent>
                </Card>
            </Grid>
            )}

         </Grid>
          </>
        )}
      </Container>
    </>
  );
};

export default EstadisticasHorasExtras;
