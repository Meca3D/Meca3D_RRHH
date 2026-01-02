// utils/dateUtils.js
import { 
  format, isWeekend, isAfter, isBefore, isSameDay, addDays,
  startOfMonth, startOfWeek, addMonths, subMonths, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';

// Formateo básico
export const formatYMD = (date) => format(date, 'yyyy-MM-dd');

export const formatearFechaEspanol = (fecha) => 
  format(parseISO(fecha), 'EEEE, d MMMM yyyy', { locale: es });

export const formatearFechaEspanol2 = (fecha) => 
  format(parseISO(fecha), 'd MMMM yyyy, EEEE', { locale: es });

export const formatearFechaCorta = (fecha) => 
  format(parseISO(fecha), 'd MMM yyyy', { locale: es });

export const formatearFechaLarga = (fecha) => 
  format(parseISO(fecha), 'd MMMM yyyy', { locale: es });

export const formatearMesAno = (date) => 
  format(date, 'MMMM yyyy', { locale: es });

// Verificaciones de fecha
export const esFinDeSemana = (fecha) => {
  const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
  return isWeekend(date);
};

export const esFechaPasada = (fecha) => {
  const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
  const hoy = new Date();
   hoy.setHours(0, 0, 0, 0);
  return isBefore(date, hoy);
};

export const esFechaHoy = (fecha) => {
  const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
  return isSameDay(date, new Date());
};

export const esFechaPasadaOHoy = (fecha) => {
  const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return isBefore(date, hoy) || isSameDay(date, hoy);
};

// Operaciones de calendario
export const obtenerDiasCalendario = (mesActual) => {
  const inicioMes = startOfMonth(mesActual);
  const inicioSemana = startOfWeek(inicioMes, { weekStartsOn: 1 }); // lunes = 1
  
  const dias = [];
  let fecha = new Date(inicioSemana);
  
  // Generar 42 días (6 semanas completas)
  for (let i = 0; i < 42; i++) {
    dias.push(new Date(fecha));
    fecha = addDays(fecha, 1);
  }
  
  return dias;
};

export const navegarMes = (mesActual, direccion) => {
  return direccion > 0 ? addMonths(mesActual, 1) : subMonths(mesActual, 1);
};

// Utilidades para vacaciones
export const crearFechaDesdeString = (fechaString) => parseISO(fechaString);

export const compararFechas = (fecha1, fecha2) => {
  const d1 = typeof fecha1 === 'string' ? parseISO(fecha1) : fecha1;
  const d2 = typeof fecha2 === 'string' ? parseISO(fecha2) : fecha2;
  
  if (isBefore(d1, d2)) return -1;
  if (isAfter(d1, d2)) return 1;
  return 0;
};

export const ordenarFechas = (fechasArray) => {
  return [...fechasArray].sort(compararFechas);
};
