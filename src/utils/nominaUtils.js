import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

export const formatDate = (date) => {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es });
};

export const formatDateForInput = (date) => {
  return format(new Date(date), 'yyyy-MM-dd');
};

export const tiposHorasExtra = [
  { value: 'normal', label: 'Normal', color: '#3B82F6' },
  { value: 'nocturna', label: 'Nocturna', color: '#6366F1' },
  { value: 'festiva', label: 'Festiva', color: '#F59E0B' },
  { value: 'festivaNocturna', label: 'Festiva Nocturna', color: '#EF4444' }
];

export const sugerenciasFechas = [
  {
    label: "Últimos 7 días",
    dias: 7,
    descripcion: "Para ver horas recientes"
  },
  {
    label: "Últimos 15 días", 
    dias: 15,
    descripcion: "Período corto común"
  },
  {
    label: "Últimos 30 días",
    dias: 30,
    descripcion: "Aproximadamente un mes"
  },
  {
    label: "Últimos 45 días",
    dias: 45,
    descripcion: "Período extendido"
  }
];

export const calcularFechasSugeridas = (diasAtras) => {
  const hoy = new Date();
  const fechaInicio = new Date();
  fechaInicio.setDate(hoy.getDate() - diasAtras);
  
  return {
    fechaInicio: formatDateForInput(fechaInicio),
    fechaFin: formatDateForInput(hoy)
  };
};

export const validarPeriodo = (fechaInicio, fechaFin) => {
  const errors = {};
  
  if (!fechaInicio) {
    errors.fechaInicio = 'La fecha de inicio es obligatoria';
  }
  
  if (!fechaFin) {
    errors.fechaFin = 'La fecha de fin es obligatoria';
  }
  
  if (fechaInicio && fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    if (inicio > fin) {
      errors.fechaInicio = 'La fecha de inicio no puede ser posterior a la fecha de fin';
    }
    
    // Validar que no sea un período demasiado largo (ej: más de 3 meses)
    const diffTime = Math.abs(fin - inicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 90) {
      errors.general = 'El período no puede ser mayor a 90 días';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validarHorasExtra = (data) => {
  const errors = {};
  
  if (!data.fecha) {
    errors.fecha = 'La fecha es obligatoria';
  }
  
  if (!data.tipo) {
    errors.tipo = 'El tipo de hora extra es obligatorio';
  }
  
  if (!data.horas || data.horas <= 0) {
    errors.horas = 'Las horas deben ser mayor que 0';
  }
  
  if (data.horas > 24) {
    errors.horas = 'No se pueden registrar más de 24 horas en un día';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const calcularImporteHorasExtra = (horas, tarifa) => {
  return parseFloat((horas * tarifa).toFixed(2));
};

// ✅ NUEVA - Función para calcular días entre fechas
export const calcularDiasEntreFechas = (fechaInicio, fechaFin) => {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diffTime = Math.abs(fin - inicio);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ✅ NUEVA - Función para formatear período para mostrar
export const formatearPeriodo = (fechaInicio, fechaFin) => {
  const dias = calcularDiasEntreFechas(fechaInicio, fechaFin);
  return `${formatDate(fechaInicio)} - ${formatDate(fechaFin)} (${dias} días)`;
};

export const formatearTiempo = (horas, minutos) => {
  const h = parseInt(horas) || 0;
  const m = parseInt(minutos) || 0;
  
  if (h === 0 && m === 0) return '0min';
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

export const convertirHorasMinutosADecimal = (horas, minutos) => {
  const horasNum = parseInt(horas) || 0;
  const minutosNum = parseInt(minutos) || 0;
  return horasNum + (minutosNum / 60);
};
