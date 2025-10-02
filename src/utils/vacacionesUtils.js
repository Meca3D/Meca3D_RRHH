// utils/vacacionesUtils.js
export const formatearTiempoVacas = (horas) => {
  if (horas === 0) return '0h';
  const dias = Math.floor(horas / 8);
  const horasRestantes = horas % 8;
  
  if (dias === 0) return `${horasRestantes}h`;
  if (horasRestantes === 0) return `${dias}d`;
  return `${dias}d ${horasRestantes}h`;
};

export const formatearTiempoVacasLargo = (horas) => {
  if (horas === 0) {
    return '0 horas';
  }

  const dias = Math.floor(horas / 8);
  const horasRestantes = horas % 8;

  let resultado = '';

  if (dias > 0) {
    resultado += `${dias} día${dias > 1 ? 's' : ''}`;
  }

  if (horasRestantes > 0) {
    // Si ya hay días, añade un espacio antes de las horas
    if (dias > 0) {
      resultado += ' ';
    }
    resultado += `${horasRestantes} hora${horasRestantes > 1 ? 's' : ''}`;
  }

  return resultado;
};

// Validaciones de negocio
export const validarSolicitudVacaciones = (tipoSolicitud, horasSolicitadas, fechasSeleccionadas, horasLibres) => {
  const errores = [];
  
  if (fechasSeleccionadas.length === 0) {
    errores.push('Debes seleccionar al menos una fecha');
  }
  
  if (tipoSolicitud === 'horas' && horasSolicitadas >= 8) {
    errores.push('Para 8 horas o más, usa "Días completos"');
  }
  
  const horasTotales = tipoSolicitud === 'dias' 
    ? fechasSeleccionadas.length * 8 
    : horasSolicitadas;
    
  if (horasTotales > horasLibres) {
    errores.push(`No tienes suficientes horas disponibles. Libres: ${formatearTiempoVacas(horasLibres)}`);
  }
  
  return { esValido: errores.length === 0, errores, horasTotales };
};
