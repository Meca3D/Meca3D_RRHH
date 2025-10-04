
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, FormControl, InputLabel, Select, MenuItem,
  Grid, Paper, CircularProgress, Alert
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  Analytics,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  GetApp
} from '@mui/icons-material';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatearNombre } from '../../Helpers';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useUIStore } from '../../../stores/uiStore';
import { formatearTiempoVacas } from '../../../utils/vacacionesUtils';

const EstadisticasVacasAdmin = () => {
  const navigate = useNavigate();
  const {
    calcularDistribucionMensual,
    calcularKPIsAprobacion,
    calcularUsoPorEmpleado,
    calcularDistribucionPorPuestos
  } = useVacacionesStore();
  const { showError } = useUIStore();

  // Estados principales
  const [loading, setLoading] = useState(false);
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear());

  // Estados de datos
  const [distribucionMensual, setDistribucionMensual] = useState([]);
  const [kpisAprobacion, setKpisAprobacion] = useState({});
  const [usoPorEmpleado, setUsoPorEmpleado] = useState([]);
  const [distribucionPuestos, setDistribucionPuestos] = useState([]);

  // Colores para gráficos
  const COLORES_GRAFICOS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
    '#d084d0', '#87d068', '#ffc0cb', '#ffb347', '#87ceeb'
  ];

  // Cargar datos cuando cambia el año
  useEffect(() => {
    cargarDatosAnaliticos();
  }, [añoSeleccionado]);

  const cargarDatosAnaliticos = async () => {
    setLoading(true);
    try {
      const [mensual, kpis, empleados, puestos] = await Promise.all([
        calcularDistribucionMensual(añoSeleccionado),
        calcularKPIsAprobacion(añoSeleccionado),
        calcularUsoPorEmpleado(añoSeleccionado),
        calcularDistribucionPorPuestos(añoSeleccionado)
      ]);

      setDistribucionMensual(mensual);
      setKpisAprobacion(kpis);
      setUsoPorEmpleado(empleados);
      setDistribucionPuestos(puestos);
    } catch (error) {
      showError(`Error cargando analíticas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generar opciones de años
  const añosDisponibles = () => {
    const añoActual = new Date().getFullYear();
    const años = [];
    for (let i = añoActual; i >= añoActual - 3; i--) {
      años.push(i);
    }
    return años;
  };

  // Preparar datos para gráfico de estados
  const datosEstados = [
    { name: 'Aprobadas', value: kpisAprobacion.aprobadas || 0, color: '#4caf50' },
    { name: 'Denegadas', value: kpisAprobacion.denegadas || 0, color: '#f44336' },
    { name: 'Canceladas', value: kpisAprobacion.canceladas || 0, color: '#ff9800' },
    { name: 'Pendientes', value: kpisAprobacion.pendientes || 0, color: '#2196f3' }
  ];

  return (
    <>
     <AppBar  
            sx={{ 
              overflow:'hidden',
              background: 'linear-gradient(135deg, #FF99D6 0%, #FF66A3 50%, #FF3385 100%)',
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
              <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
                <Typography 
                  variant="h5" 
                  fontWeight="bold" 
                  sx={{ 
                    fontSize: { xs: '1.1rem', sm: '1.3rem' },
                    lineHeight: 1.2
                  }}
                >
                  Análisis y Estadísticas
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    opacity: 0.9,
                    fontSize: { xs: '0.9rem', sm: '1rem' }
                  }}
                >
                  KPIs y tendencias de vacaciones
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

      <Container maxWidth="xl" sx={{ pb: 4 }}>
        {/* Controles */}
        <Card sx={{ mb: 3, mt:1.5 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Año</InputLabel>
                <Select
                  value={añoSeleccionado}
                  label="Año"
                  onChange={(e) => setAñoSeleccionado(e.target.value)}
                >
                  {añosDisponibles().map(año => (
                    <MenuItem key={año} value={año}>{año}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<GetApp />}
                onClick={() => {
                  // Implementar export de datos
                  console.log('Exportar analíticas...');
                }}
                sx={{ 
                  borderColor: 'blue.main',
                  color: 'blue.main',
                  '&:hover': { bgcolor: 'blue.50' }
                }}
              >
                Exportar Datos
              </Button>

              <Typography variant="body2" sx={{ ml: 'auto' }}>
                Datos de {añoSeleccionado}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={48} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Cargando analíticas...
            </Typography>
          </Box>
        ) : (
          <>
            {/* KPIs principales */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.50' }}>
                  <Typography variant="h3" fontWeight={600} color="success.main">
                    {kpisAprobacion.tasaAprobacion || 0}%
                  </Typography>
                  <Typography variant="body2">Tasa de Aprobación</Typography>
                </Paper>
              </Grid>
              
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'info.50' }}>
                  <Typography variant="h3" fontWeight={600} color="info.main">
                    {kpisAprobacion.tiempoMedioAprobacion || 0}
                  </Typography>
                  <Typography variant="body2">Días Promedio Resolución</Typography>
                </Paper>
              </Grid>
              
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'warning.50' }}>
                  <Typography variant="h3" fontWeight={600} color="warning.main">
                    {kpisAprobacion.total || 0}
                  </Typography>
                  <Typography variant="body2">Solicitudes Totales</Typography>
                </Paper>
              </Grid>
              
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.50' }}>
                  <Typography variant="h3" fontWeight={600} color="primary.main">
                    {usoPorEmpleado.length || 0}
                  </Typography>
                  <Typography variant="body2">Empleados Activos</Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Gráficos principales */}
            <Grid container spacing={3}>
              {/* Distribución mensual - LineChart */}
              <Grid size={{ xs: 12, lg: 8 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp color="primary" />
                      Distribución Mensual de Vacaciones
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={distribucionMensual}
                        margin={{
                            top: 20,
                            right: -10,
                            bottom: -10,
                            left: -30,
                          }}
                      >
                        <defs>
                          <linearGradient id="colorDias" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSolicitudes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'diasTotales' ? `${value} días` : `${value} solicitudes`,
                            name === 'diasTotales' ? 'Días de vacaciones' : 'Solicitudes'
                          ]}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="diasTotales"
                          stroke="#8884d8"
                          fillOpacity={1}
                          fill="url(#colorDias)"
                          name="Días totales"
                        />
                        <Area
                          type="monotone"
                          dataKey="solicitudes"
                          stroke="#82ca9d"
                          fillOpacity={1}
                          fill="url(#colorSolicitudes)"
                          name="Solicitudes"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Estados de solicitudes - PieChart */}
              <Grid size={{ xs: 12, lg: 4 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PieChartIcon color="primary" />
                      Estados de Solicitudes
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={datosEstados}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {datosEstados.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}`, 'Solicitudes']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Uso por empleado - BarChart */}
              <Grid size={{ xs: 12, lg: 8 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BarChartIcon color="primary" />
                      Top 10 - Uso de Vacaciones por Empleado
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={usoPorEmpleado.slice(0, 10)}
                      margin={{
                            top: 20,
                            right: -10,
                            bottom: -10,
                            left: -20,
                          }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="nombre" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'horasUsadas' ? formatearTiempoVacas(value) : `${value}%`,
                            name === 'horasUsadas' ? 'Horas usadas' : '% de uso'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="horasUsadas" fill="#8884d8" name="Horas usadas" />
                        <Bar dataKey="porcentajeUso" fill="#82ca9d" name="% de uso" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Distribución por puestos */}
              <Grid size={{ xs: 12, lg: 4 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Distribución por Puestos
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={distribucionPuestos.slice(0, 6)}
                        layout="horizontal"
                        margin={{
                            top: 20,
                            right: -10,
                            bottom: -10,
                            left: -10,
                          }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="puesto" 
                          width={100}
                        />
                        <Tooltip 
                          formatter={(value) => [formatearTiempoVacas(value), 'Horas totales']}
                        />
                        <Bar dataKey="horasTotales" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Análisis adicional */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid size={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Análisis de Tendencias
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Alert severity="info">
                          <Typography variant="subtitle2">Pico estacional</Typography>
                          <Typography variant="body2">
                            {(() => {
                              const mesConMasDias = distribucionMensual.reduce((max, mes) => 
                                mes.diasTotales > max.diasTotales ? mes : max, 
                                { mes: 'N/A', diasTotales: 0 }
                              );
                              return `${mesConMasDias.mes} con ${mesConMasDias.diasTotales} días`;
                            })()}
                          </Typography>
                        </Alert>
                      </Grid>
                      
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Alert severity="success">
                          <Typography variant="subtitle2">Empleado más activo</Typography>
                          <Typography variant="body2">
                            {usoPorEmpleado.length > 0 ? 
                              `${usoPorEmpleado[0].nombre} - ${formatearTiempoVacas(usoPorEmpleado[0].horasUsadas)}` :
                              'Sin datos'
                            }
                          </Typography>
                        </Alert>
                      </Grid>
                      
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Alert severity="warning">
                          <Typography variant="subtitle2">Puesto con más uso</Typography>
                          <Typography variant="body2">
                            {distribucionPuestos.length > 0 ?
                              `${distribucionPuestos[0].puesto} - ${formatearTiempoVacas(distribucionPuestos[0].horasTotales)}` :
                              'Sin datos'
                            }
                          </Typography>
                        </Alert>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </>
  );
};

export default EstadisticasVacasAdmin;
