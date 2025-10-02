
export const formatDate = (date) => {
  if (!date) return '';
  
  // ✅ Si es un Timestamp de Firestore, convertir a Date
  if (date && typeof date.toDate === 'function') {
    date = date.toDate();
  }
  
  // ✅ Si es string, convertir a Date
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  // ✅ Verificar que sea un objeto Date válido
  if (!(date instanceof Date) || isNaN(date)) {
    return 'Fecha inválida';
  }
  
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function formatearNombre(nombre) {
  if (!nombre || typeof nombre !== 'string') {
    return '';
  }
  
  // Limpiar espacios extra y dividir por espacios
  const partes = nombre.trim().split(/\s+/);
  
  if (partes.length === 0) {
    return '';
  }
  
  if (partes.length === 1) {
    // Solo un nombre, devolver completo
    return partes[0];
  }
  
  // Primer nombre completo + iniciales de los apellidos
  const primerNombre = partes[0];
  const inicialesApellidos = partes.slice(1)
    .map(apellido => apellido.charAt(0).toUpperCase())
    .join('');
  
  return `${primerNombre} ${inicialesApellidos}`;
}

export function iniciales(nombre) {
  if (!nombre || typeof nombre !== 'string') {
    return '';
  }
  
  // Limpiar espacios extra y dividir por espacios
  const partes = nombre.trim().split(/\s+/);
  
  if (partes.length === 0) {
    return '';
  }
  
  if (partes.length === 1) {
    // Solo un nombre, devolver primera Inicial
    return partes[0][0];
  }
  
  // Inicial nombre + inicial del primer Apellido
  const inicialNombre = partes[0][0];
  const inicialApellido = partes[1][0]
  
  return inicialNombre+inicialApellido;
}

export function capitalizeFirstLetter(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return str;
  }
  
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function obtenerNumeroMes (nombreMes) {
  const meses = {
    'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4, 'Mayo': 5, 'Junio': 6, 'P.E. Verano':6.5,
    'Julio': 7, 'Agosto': 8, 'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'P.E. Navidad':11.5, 'Diciembre': 12
  };
  return meses[nombreMes] || 0;
};
