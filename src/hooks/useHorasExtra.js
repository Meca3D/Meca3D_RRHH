
import { useState, useCallback } from 'react';
import { getHorasExtraPorPeriodoSimple } from '../firebase/firestore';

export const useHorasExtra = () => {
  const [horasExtra, setHorasExtra] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarHorasExtra = useCallback(async (userEmail, fechaInicio, fechaFin) => {
    if (!userEmail || !fechaInicio || !fechaFin) {
      setHorasExtra([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const datos = await getHorasExtraPorPeriodoSimple(userEmail, fechaInicio, fechaFin);
      setHorasExtra(datos);
    } catch (err) {
      console.error('Error cargando horas extra:', err);
      setError('Error cargando datos');
      setHorasExtra([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { horasExtra, loading, error, cargarHorasExtra };
};
