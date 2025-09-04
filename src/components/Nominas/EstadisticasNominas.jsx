// components/Nominas/EstadisticasNominas.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Card, CardContent, AppBar, Toolbar,
  IconButton, Alert, CircularProgress, Chip, MenuItem, TextField, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Divider
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  AttachMoney as AttachMoneyIcon, 
  PieChart as PieChartIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  History as HistoryIcon,
  BarChart as BarChartIcon 
} from '@mui/icons-material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, ComposedChart,
} from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { useNominaStore } from '../../stores/nominaStore';
import { useUIStore } from '../../stores/uiStore';
import { formatCurrency } from '../../utils/nominaUtils';
import { obtenerNumeroMes, capitalizeFirstLetter } from '../Helpers';

// Colores para los gráficos de pastel (puedes ajustarlos)
const COLORES_PIE = ['#3B82F6', '#10B981', '#EF4444', '#FB8C00', '#7B1FA2', '#F59E0B'];

// Define el orden deseado para la leyenda del gráfico combinado
const legendCombinedOrder = [
  'Salario Total',
    'Sueldo Base',
    'Trienios',
    'Horas Extras',
    'Otros Comp.',
    'Extras Adic.',
    'Deducciones',
];

const tooltipCombinedOrder = [
  { key: 'sueldoBase', name: 'Sueldo Base', color: '#3B82F6' },
  { key: 'trienios', name: 'Trienios', color: '#10B981' },
  { key: 'horasExtra', name: 'Horas Extra', color: '#EF4444' },
  { key: 'otrosComplementos', name: 'Otros Comp.', color: '#FB8C00' },
  { key: 'extrasAdicionales', name: 'Extras Adic.', color: '#7B1FA2' },
  { key: 'deduccionesAdicionales', name: 'Deducciones', color: '#F59E0B' }, 
  { key: 'totalNominaNeta', name: 'Salario Total', color: '#FF6B6B' },
];

const CustomCombinedChartLegend = (props) => {
  const {  payload, legendVisibilityFlags, totalNominaNetaOverall } = props;
  // Crear un mapa para acceder rápidamente a los elementos del payload por su nombre
  const payloadMap = new Map(payload.map(entry => [entry.value, entry]));

return (
    <ul style={{ listStyle: 'none', padding: 0, paddingLeft: 10, margin: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
      {legendCombinedOrder.map((name) => {
        const entry = payloadMap.get(name);
        if (!entry) {
          return null; 
        }

        if (name === 'Salario Total') {
          // Si el total neto general es efectivamente cero, no lo mostramos
          if (Math.abs(totalNominaNetaOverall) < 0.005) {
            return null; 
          }
        } else {
          // Para otros conceptos, se muestran si su nombre está en el conjunto de conceptos presentes
          if (!legendVisibilityFlags.has(name)) {
            return null;
          }
        }

        const { value, color, type } = entry;
        let dotColor = color;

        if (value === 'Salario Total') {
          dotColor = '#FF6B6B';
        }

        return (
          <li key={value} style={{ display: 'inline-flex', alignItems: 'center', marginRight: '10px', marginBottom: '5px', fontSize: '0.8rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: type === 'line' ? '20px' : '10px', 
                height: type === 'line' ? '2px' : '10px',  
                borderRadius: type === 'line' ? '0' : '2px', 
                backgroundColor: dotColor,
                marginRight: '5px',
                verticalAlign: 'middle', 
              }}
            />
            {value}
          </li>
        );
      })}
    </ul>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Crear un mapa para acceder rápidamente a los datos del payload por su dataKey
    const payloadMap = new Map(payload.map(entry => [entry.dataKey, entry]));

    return (
      <Paper elevation={3} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.1)' }}>
        <Typography textAlign="center" variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        <Divider sx={{bgcolor: 'black', mb:1}} />

         {tooltipCombinedOrder.map((item) => {
          const entry = payloadMap.get(item.key);
          if (entry && Math.abs(entry.value) >= 0.005) { // Mostrar solo si el valor no es cero (con tolerancia)
            return (
              <Box key={item.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
                <Typography  variant="body1" fontWeight="bold" sx={{ color: item.color, mr: 1 }}>
                  {item.name}:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(entry.value)}
                </Typography>
              </Box>
            );
          }
          return null;
        })}
      </Paper>
    );
  }

  return null;
};


const EstadisticasNominas = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { 
    nominasGuardadas, 
    loadNominasUsuario, 
    getEstadisticasPeriodoNomina,
    loading: nominasLoading 
  } = useNominaStore();
  const { showError } = useUIStore();

  // Opciones de meses y años para el selector personalizado
  const mesesOpciones = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('es-ES', { month: 'long' })
  }));
  // Añadir los meses de paga extra a las opciones (si se necesitan en el selector)
  mesesOpciones.push(
    { value: 6.5, label: 'P.E. Verano' },
    { value: 11.5, label: 'P.E. Navidad' }
  );

  const anoActual = new Date().getFullYear();
  const anosOpciones = Array.from({ length: 5 }, (_, i) => ({
    value: anoActual - i,
    label: (anoActual - i).toString()
  }));

 
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

  // ✅ Calcular fechas/períodos según selección
  const calcularPeriodoFechas = (periodo, currentYear = new Date().getFullYear(), currentMonth = new Date().getMonth() + 1) => {
    let startMonth, startYear, endMonth, endYear;

    switch (periodo) {
      case 'mesActual':
        startMonth = currentMonth;
        startYear = currentYear;
        endMonth = currentMonth;
        endYear = currentYear;
        break;
      case 'mesAnterior':
        startMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        startYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        endMonth = startMonth;
        endYear = startYear;
        break;
      case 'ultimos3meses':
        endMonth = currentMonth;
        endYear = currentYear;
        startMonth = currentMonth - 2;
        startYear = currentYear;
        if (startMonth <= 0) {
          startMonth += 12;
          startYear -= 1;
        }
        break;
      case 'ultimos6meses':
        endMonth = currentMonth;
        endYear = currentYear;
        startMonth = currentMonth - 5;
        startYear = currentYear;
        if (startMonth <= 0) {
          startMonth += 12;
          startYear -= 1;
        }
        break;
      case 'anoActual':
        startMonth = 1;
        startYear = currentYear;
        endMonth = 12;
        endYear = currentYear;
        break;
      case 'anoAnterior':
        startMonth = 1;
        startYear = currentYear - 1;
        endMonth = 12;
        endYear = currentYear - 1;
        break;
      default: // Personalizado
        return { mesInicio: null, anoInicio: null, mesFin: null, anoFin: null }; 
    }
    return { mesInicio: startMonth, anoInicio: startYear, mesFin: endMonth, anoFin: endYear };
  };

  // ✅ Inicializar estados de fecha/año con el período por defecto (año actual)
  const initialPeriodDates = calcularPeriodoFechas('anoActual');
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('anoActual'); 
  const [mesInicio, setMesInicio] = useState(initialPeriodDates.mesInicio);
  const [anoInicio, setAnoInicio] = useState(initialPeriodDates.anoInicio);
  const [mesFin, setMesFin] = useState(initialPeriodDates.mesFin);
  const [anoFin, setAnoFin] = useState(initialPeriodDates.anoFin);
  const [estadisticas, setEstadisticas] = useState(null);
  const [datosGraficos, setDatosGraficos] = useState({
    evolucionNetaMensual: [],
    desgloseNomina: [],
    monthlyConcepts: [], 
    totalPagasExtrasGross: 0, 
    totalDeduccionesPagasExtras: 0,
    grandTotalCobrado: 0,
    legendVisibilityFlags: new Set(),
  });


  // ✅ Cargar nóminas al montar y cuando cambie el usuario
  useEffect(() => {
    if (user?.email) {
      const unsubscribe = loadNominasUsuario(user.email);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user?.email, loadNominasUsuario]);

  // ✅ Filtrar y procesar datos cuando cambien las nóminas o el período
  useEffect(() => {

    if (!nominasGuardadas.length && !nominasLoading) {
      setEstadisticas(null);
      setDatosGraficos({ 
        evolucionNetaMensual: [], 
        desgloseNomina: [],
        monthlyConcepts: [],
        totalPagasExtrasGross: 0,
        totalDeduccionesPagasExtras: 0,
        grandTotalCobrado: 0,
        legendVisibilityFlags: new Set(),
      });
      return;
    }

    let currentMesInicio = mesInicio;
    let currentAnoInicio = anoInicio;
    let currentMesFin = mesFin;
    let currentAnoFin = anoFin;

    // Recalcular fechas para períodos predefinidos si el periodoSeleccionado no es 'personalizado'
    if (periodoSeleccionado !== 'personalizado') {
      const { mesInicio: sM, anoInicio: sA, mesFin: eM, anoFin: eA } = calcularPeriodoFechas(periodoSeleccionado);
      currentMesInicio = sM;
      currentAnoInicio = sA;
      currentMesFin = eM;
      currentAnoFin = eA;
      // Actualizar los estados de fecha para el UI
      setMesInicio(sM);
      setAnoInicio(sA);
      setMesFin(eM);
      setAnoFin(eA);
    }
    
    let filteredNominas = [];
    if (currentMesInicio && currentAnoInicio && currentMesFin && currentAnoFin) {
      filteredNominas = nominasGuardadas.filter(nomina => {
        // ✅ Usar obtenerNumeroMes para convertir el nombre del mes a número
        const nominaMesNumero = obtenerNumeroMes(nomina.mes); 
        if (nominaMesNumero === 0) { // Si el mes no es válido, ignorar esta nómina
          return false;
        }
        const nominaDate = new Date(nomina.año, Math.ceil(nominaMesNumero) - 1); 
        const startDate = new Date(currentAnoInicio, currentMesInicio - 1);
        const endDate = new Date(currentAnoFin, currentMesFin - 1);
        // Ajustar endDate al final del mes para inclusión
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0); // Último día del mes

        return nominaDate >= startDate && nominaDate <= endDate;
      });
    } else {
      setEstadisticas(null);
      setDatosGraficos({ 
        evolucionNetaMensual: [], 
        desgloseNomina: [],
        monthlyConcepts: [],
        totalPagasExtrasGross: 0,
        totalDeduccionesPagasExtras: 0,
        grandTotalCobrado: 0,
        legendVisibilityFlags: new Set(),
      }); // Actualizado
      return;
    }


    if (filteredNominas.length > 0) {
      const stats = getEstadisticasPeriodoNomina(filteredNominas);
      setEstadisticas(stats);
      procesarDatosGraficos(filteredNominas, stats);
    } else {
      setEstadisticas(null);
      setDatosGraficos({ 
        evolucionNetaMensual: [], 
        desgloseNomina: [],
        monthlyConcepts: [],
        totalPagasExtrasGross: 0,
        totalDeduccionesPagasExtras: 0,
        grandTotalCobrado: 0,
        legendVisibilityFlags: new Set(),
      }); 
      return
    }
  }, [nominasGuardadas, periodoSeleccionado, mesInicio, anoInicio, mesFin, anoFin, nominasLoading, getEstadisticasPeriodoNomina]);


  const procesarDatosGraficos = (nominas, stats) => {
    // Para el gráfico combinado, solo consideramos nóminas mensuales
    const nominasMensuales = nominas.filter(nomina => nomina.tipo === "mensual");

    const combinedChartDataMap = {};

    nominasMensuales.forEach(nomina => {
        const nominaMesNumero = obtenerNumeroMes(nomina.mes);
        const key = `${nomina.año}-${nominaMesNumero}`; 

        if (!combinedChartDataMap[key]) {
            combinedChartDataMap[key] = {
                mesAno: nomina.mes, // Keep original month name for display
                año: nomina.año, // Keep year for sorting
                totalNominaNeta: 0, // For the line chart
                sueldoBase: 0,
                trienios: 0,
                otrosComplementos: 0,
                horasExtra: 0,
                extrasAdicionales: 0,
                deduccionesAdicionales: 0
            };
        }

        combinedChartDataMap[key].totalNominaNeta += (nomina.total || 0);
        combinedChartDataMap[key].sueldoBase += (nomina.sueldoBase || 0);
        combinedChartDataMap[key].trienios += (nomina.trienios || 0);
        combinedChartDataMap[key].otrosComplementos += (nomina.otrosComplementos?.reduce((sum, comp) => sum + (comp.importe || 0), 0) || 0);
        combinedChartDataMap[key].horasExtra += (nomina.horasExtra?.desglose?.reduce((sum, h) => sum + (h.importe || 0), 0) || 0);
        combinedChartDataMap[key].extrasAdicionales += (nomina.extra?.cantidad || 0);
        combinedChartDataMap[key].deduccionesAdicionales += -(nomina.deduccion?.cantidad || 0);
    });

    const combinedChartData = Object.values(combinedChartDataMap).sort((a, b) => {
        const numMesA = obtenerNumeroMes(a.mesAno);
        const numMesB = obtenerNumeroMes(b.mesAno);
        const anoA = a.año || new Date().getFullYear(); 
        const anoB = b.año || new Date().getFullYear(); 
        
        if (anoA !== anoB) {
            return anoA - anoB;
        }
        return numMesA - numMesB;
    });

    // 2. Desglose de la Nómina (para el período seleccionado) - Este se mantiene igual
    const desgloseNomina = Object.entries(stats.breakdown)
      .filter(([name, value]) => value > 0 && name !== 'Deducciones Adicionales') 
      .map(([name, value], index) => ({
        name,
        value: value || 0, 
        color: COLORES_PIE[index % COLORES_PIE.length]
      }))
      

  // --- Data for the new Summary Table ---
    const monthlyNominasFiltered = nominas.filter(n => n.tipo === "mensual");
    const extraPayNominas = nominas.filter(n => n.mes === 'P.E. Verano' || n.mes === 'P.E. Navidad'); // Assuming 'mes' identifies extra pays

    const monthlyConcepts = [
        { name: 'Sueldo Base', value: monthlyNominasFiltered.reduce((sum, n) => sum + (n.sueldoBase || 0), 0) },
        { name: 'Trienios', value: monthlyNominasFiltered.reduce((sum, n) => sum + (n.trienios || 0), 0) },
        { name: 'Horas Extras', value: monthlyNominasFiltered.reduce((sum, n) => sum + (n.horasExtra?.desglose?.reduce((hSum, h) => hSum + (h.importe || 0), 0) || 0), 0) },
        { name: 'Otros Complementos', value: monthlyNominasFiltered.reduce((sum, n) => sum + (n.otrosComplementos?.reduce((cSum, c) => cSum + (c.importe || 0), 0) || 0), 0) },
        { name: 'Extras Adicionales', value: monthlyNominasFiltered.reduce((sum, n) => sum + (n.extra?.cantidad || 0), 0) },
        { name: 'Deducciones Mensuales', value: monthlyNominasFiltered.reduce((sum, n) => sum + (-n.deduccion?.cantidad || 0), 0) }, // ✅ Renombrado y específico para mensuales
    ].filter(concept => concept.value !== 0); // Filter out zero values

      const legendVisibilityFlags = new Set(
      monthlyConcepts.map(c => {
        if (c.name === 'Deducciones Mensuales') {
          return 'Deducciones'; // Este es el nombre que la leyenda espera
        }
        return c.name; // Para los demás conceptos, usa su nombre original
      })
    );



    // ✅ Calcular el total bruto de pagas extras
    const totalPagasExtrasGross = extraPayNominas.reduce((sum, n) => sum + (n.importePagaExtra || 0), 0);
    // ✅ Calcular el total de deducciones de pagas extras
    const totalDeduccionesPagasExtras = extraPayNominas.reduce((sum, n) => sum + (-n.deduccion?.cantidad || 0), 0);
    
    // The grand total is already available in stats.totalNominaNeta
    // The grand total is already available in stats.totalNominaNeta
    const grandTotalCobrado = stats.totalNominaNeta;

    setDatosGraficos({
      evolucionNetaMensual: combinedChartData, // contiene los datos para el gráfico combinado
      desgloseNomina,
      monthlyConcepts, 
      totalPagasExtrasGross, 
      totalDeduccionesPagasExtras,
      grandTotalCobrado, 
      legendVisibilityFlags, 
    });
  };

  const handlePeriodoChange = (e) => {
    const newPeriodo = e.target.value;
    setPeriodoSeleccionado(newPeriodo);
    // Si se cambia a un período predefinido, recalcular y establecer las fechas
    if (newPeriodo !== 'personalizado') {
      const { mesInicio: sM, anoInicio: sA, mesFin: eM, anoFin: eA } = calcularPeriodoFechas(newPeriodo);
      setMesInicio(sM);
      setAnoInicio(sA);
      setMesFin(eM);
      setAnoFin(eA);
    } else {
      // Si se cambia a personalizado, resetear los campos de fecha/año para que el usuario los seleccione
      setMesInicio('');
      setAnoInicio('');
      setMesFin('');
      setAnoFin('');
    }
  };

 const getPeriodoDisplay = () => {
    // Obtener los nombres de los meses de las opciones
    const getMonthName = (monthValue) => {
      const option = mesesOpciones.find(m => m.value === parseFloat(monthValue));
      return option ? capitalizeFirstLetter(option.label) : '';
    };

    if (periodoSeleccionado === 'personalizado') {
      if (mesInicio && anoInicio && mesFin && anoFin) {
        const startMonthName = getMonthName(mesInicio);
        const endMonthName = getMonthName(mesFin);
        if (anoInicio === anoFin) {
          if (mesInicio === mesFin) {
            return `${startMonthName} ${anoInicio}`;
          }
          return `${startMonthName} ${anoInicio} - ${endMonthName} ${anoFin}`;
        }
        return `${startMonthName} ${anoInicio} - ${endMonthName} ${anoFin}`;
      }
      return 'Selecciona un período personalizado';
    } else {
      // Para períodos predefinidos, calcular las fechas y mostrar los nombres de los meses
      const { mesInicio: sM, anoInicio: sA, mesFin: eM, anoFin: eA } = calcularPeriodoFechas(periodoSeleccionado);
      if (sM && sA && eM && eA) {
        const startMonthName = getMonthName(sM);
        const endMonthName = getMonthName(eM);
        if (sA === eA) {
          if (sM === eM) {
            return `${startMonthName} ${sA}`;
          }
          return `${startMonthName} ${sA} - ${endMonthName} ${eA}`;
        }
        return `${startMonthName} ${sA} - ${endMonthName} ${eA}`;
      }
      return periodosPreconfigurados.find(p => p.value === periodoSeleccionado)?.label; 
    }
  };

// Función para generar ticks "bonitos" que incluyen los límites y el cero
const generateNiceTicks = (min, max, tickCount = 7) => {
  const ticks = [];

  ticks.push(parseFloat(min.toFixed(2)));
  ticks.push(parseFloat(max.toFixed(2)));

  if (min < 0 && max > 0) {
    ticks.push(0);
  }

  const range = max - min;
  let step = range / (tickCount - 1);

  // Función auxiliar para redondear el paso a un número "bonito"
  const roundStepToNiceNumber = (s) => {
    const absS = Math.abs(s);
    if (absS === 0) return 1; // Evitar log10(0)
    const exp = Math.floor(Math.log10(absS));
    const f = absS / Math.pow(10, exp);
    let niceF;
    if (f < 1.5) niceF = 1;
    else if (f < 3) niceF = 2;
    else if (f < 7) niceF = 5;
    else niceF = 10;
    return niceF * Math.pow(10, exp);
  };
  step = roundStepToNiceNumber(step);
  let current = Math.floor(min / step) * step;
  if (current < min && Math.abs(current - min) > step * 0.01) { // Pequeña tolerancia
    current += step;
  }

  while (current <= max + step * 0.01) { 
    const roundedCurrent = parseFloat(current.toFixed(2));
    if (!ticks.includes(roundedCurrent)) {
      ticks.push(roundedCurrent);
    }
    current += step;
  }

  return Array.from(new Set(ticks)).sort((a, b) => a - b);
};

let rawMinChartValue = 0;
let rawMaxChartValue = 0;

datosGraficos.evolucionNetaMensual.forEach(entry => {
  const positiveSum = (entry.sueldoBase || 0) + 
                      (entry.trienios || 0) + 
                      (entry.otrosComplementos || 0) + 
                      (entry.horasExtra || 0) + 
                      (entry.extrasAdicionales || 0);

  const negativeDeduction = (entry.deduccionesAdicionales || 0); 
  rawMaxChartValue = Math.max(rawMaxChartValue, positiveSum, entry.totalNominaNeta || 0);
  rawMinChartValue = Math.min(rawMinChartValue, negativeDeduction, entry.totalNominaNeta || 0);
});

const effectiveMin = Math.min(0, rawMinChartValue);
const effectiveMax = Math.max(0, rawMaxChartValue);

const paddingFactor = 0; // (0.1=10%) % de padding
const finalMinY = parseInt(effectiveMin) - (Math.abs(effectiveMin) * paddingFactor);
const finalMaxY = effectiveMax + (Math.abs(effectiveMax) * paddingFactor);

// Generar ticks "bonitos" para el eje Y
const yAxisTicks = generateNiceTicks(parseInt(finalMinY), parseInt(finalMaxY), 7); // se puede ajustar el número de ticks (ej. 5, 7, 10)
const yAxisDomain = [yAxisTicks[0], yAxisTicks[yAxisTicks.length - 1]];


  return (
    <>
      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #FF6B6B 0%, #EE4D4D 50%, #CC3333 100%)', // Colores para Nóminas
          boxShadow: '0 2px 10px rgba(255, 107, 107, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/nominas')}
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
              Análisis de Nóminas
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
            <Typography variant="h6" gutterBottom>
              <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Período de Análisis
            </Typography>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}> 
                <TextField
                  select
                  label="Período"
                  value={periodoSeleccionado}
                  onChange={handlePeriodoChange}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main' 
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'primary.main'
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
                  <Grid size={{ xs: 6, md: 2 }}> 
                    <TextField
                      select
                      label="Mes Inicio"
                      value={mesInicio}
                      onChange={(e) => setMesInicio(e.target.value)}
                      fullWidth
                      focused
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' }
                      }}
                    >
                      {mesesOpciones.map((mes) => (
                        <MenuItem key={mes.value} value={mes.value}>
                          {mes.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}> 
                    <TextField
                      select
                      label="Año Inicio"
                      value={anoInicio}
                      onChange={(e) => setAnoInicio(e.target.value)}
                      fullWidth
                      focused
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' }
                      }}
                    >
                      {anosOpciones.map((ano) => (
                        <MenuItem key={ano.value} value={ano.value}>
                          {ano.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}> 
                    <TextField
                      select
                      label="Mes Fin"
                      value={mesFin}
                      onChange={(e) => setMesFin(e.target.value)}
                      fullWidth
                      focused
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' }
                      }}
                    >
                      {mesesOpciones.map((mes) => (
                        <MenuItem key={mes.value} value={mes.value}>
                          {mes.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}> 
                    <TextField
                      select
                      label="Año Fin"
                      value={anoFin}
                      onChange={(e) => setAnoFin(e.target.value)}
                      fullWidth
                      focused
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' }
                      }}
                    >
                      {anosOpciones.map((ano) => (
                        <MenuItem key={ano.value} value={ano.value}>
                          {ano.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}
            </Grid>

            {/* Mensaje del período actual */}
            {(periodoSeleccionado !== 'personalizado' && (mesInicio && anoInicio && mesFin && anoFin)) || 
             (periodoSeleccionado === 'personalizado' && mesInicio && anoInicio && mesFin && anoFin) ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>{getPeriodoDisplay()}</strong>
                </Typography>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        {nominasLoading ? (
          <Box textAlign="center" p={4}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Cargando estadísticas de nóminas...
            </Typography>
          </Box>
        ) : !estadisticas ? (
          <Alert severity="info">
            {!user?.email ?
              'Inicia sesión para ver tus estadísticas de nóminas.' :
              (!nominasGuardadas.length ? 'No hay nóminas guardadas para este usuario.' : 'Selecciona un período válido para ver las estadísticas.')
            }
          </Alert>
        ) : (
          <>

            {/* Gráficos */}
            <Grid container spacing={3}>
              {/* ✅ Gráfico Combinado de Evolución y Desglose Mensual */}
              {datosGraficos.evolucionNetaMensual.length > 0 && (
                <Grid size={{ xs: 12 }}> 
                  <Card elevation={5} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Evolución Mensual
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart
                          data={datosGraficos.evolucionNetaMensual} 
                          margin={{ top: 20, right: 5, left: -20, bottom: 5 }}
                          stackOffset="sign"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mesAno" tick={{ fontSize: '0.7rem', fontWeight:'bold'}} /> {/* ✅ Tamaño de fuente para XAxis */}
                          <YAxis formatter={(value) => formatCurrency(value)} tick={{ fontSize: '0.7rem', fontWeight:'bold' }} domain={yAxisDomain} ticks={yAxisTicks} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar maxBarSize={20} dataKey="sueldoBase" stackId="a" fill="#3B82F6" name="Sueldo Base" />
                          <Bar maxBarSize={20} dataKey="trienios" stackId="a" fill="#10B981" name="Trienios" />
                          <Bar maxBarSize={20} dataKey="otrosComplementos" stackId="a" fill="#FB8C00" name="Otros Comp." />
                          <Bar maxBarSize={20} dataKey="horasExtra" stackId="a" fill="#EF4444" name="Horas Extras" />
                          <Bar maxBarSize={20} dataKey="extrasAdicionales" stackId="a" fill="#7B1FA2" name="Extras Adic." />
                          <Bar maxBarSize={20} dataKey="deduccionesAdicionales" stackId="a" fill="#F59E0B" name="Deducciones" />
                          <Line type="monotone" dataKey="totalNominaNeta" name="Salario Total" stroke="#FF6B6B" strokeWidth={2} />
                          <Legend 
                            wrapperStyle={{ fontSize: '0.8rem', paddingLeft:15, paddingTop:10 }} 
                            content={<CustomCombinedChartLegend 
                                        legendVisibilityFlags={datosGraficos.legendVisibilityFlags} 
                                        totalNominaNetaOverall={estadisticas.totalNominaNeta} 
                                     />}
                                      />
                        </ComposedChart>

                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* 2. Desglose de la Nómina (Gráfico de Pastel) */}
              {datosGraficos.desgloseNomina.length > 0 && (
                <Grid size={{ xs: 12, md: 4 }}> 
                  <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <PieChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Desglose de la Nómina
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={datosGraficos.desgloseNomina}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}
                          >
                            {datosGraficos.desgloseNomina.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || COLORES_PIE[index % COLORES_PIE.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                           <Legend 
                            layout="horizontal" 
                            align="center" 
                            verticalAlign="bottom" 
                            wrapperStyle={{ fontSize: '0.8rem' }} 
                            itemSorter={(item) => {
                                return (item.payload.importe) * -1; // Ordena de mayor a menor importe
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* 3. Totales del Período (Tabla Resumen) */}
              {(datosGraficos.monthlyConcepts.length > 0 || datosGraficos.totalPagasExtrasGross !== 0 || datosGraficos.totalDeduccionesPagasExtras !== 0) && (
                <Grid size={{xs:12}}> 
                  <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Totales del Período
                      </Typography>
                      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'rgba(255, 107, 107, 0.1)' }}>
                              <TableCell sx={{ fontWeight: 'bold', pl:3 }}>Concepto</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', pr:3}}>Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {/* Conceptos de Nóminas Mensuales */}
                            {datosGraficos.monthlyConcepts.map((concept) => (
                              <TableRow key={concept.name}>
                                <TableCell>{concept.name}</TableCell>
                                <TableCell align="right">{formatCurrency(concept.value)}</TableCell>
                              </TableRow>
                            ))}

                            {/* Pagas Extras (Bruto, si las hay) */}
                            {datosGraficos.totalPagasExtrasGross !== 0 && (
                              <TableRow sx={{borderTop:'2px solid #000000'}}>
                                <TableCell >Pagas Extras</TableCell>
                                <TableCell align="right" >{formatCurrency(datosGraficos.totalPagasExtrasGross)}</TableCell>
                              </TableRow>
                            )}

                            {/* Deducciones de Pagas Extras (si las hay) */}
                            {datosGraficos.totalDeduccionesPagasExtras !== 0 && (
                              <TableRow>
                                <TableCell >Deducciones P.E.</TableCell>
                                <TableCell align="right" >{formatCurrency(datosGraficos.totalDeduccionesPagasExtras)}</TableCell>
                              </TableRow>
                            )}

                            {/* Gran Total Cobrado */}
                            <TableRow sx={{ bgcolor: 'rgba(255, 107, 107, 0.15)', '& > td': { fontWeight: 'bold' } }}>
                              <TableCell>TOTAL COBRADO</TableCell>
                              <TableCell align="right">{formatCurrency(datosGraficos.grandTotalCobrado)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
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

export default EstadisticasNominas;
