// components/Helpers.jsx - VERSIÓN CORREGIDA
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
