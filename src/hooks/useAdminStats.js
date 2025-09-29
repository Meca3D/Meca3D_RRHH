// hooks/useAdminStats.js - SOLO ESTADÍSTICAS RESUMIDAS
import { useState, useEffect } from 'react';
import { useVacacionesStore } from '../stores/vacacionesStore';

export const useAdminStats = () => {
  const {
    loadSolicitudes,
    loadConfigVacaciones, 
    configVacaciones, 
    solicitudesVacaciones,
    calcularDisponibilidadPorFecha

  }=useVacacionesStore
  const [stats, setStats] = useState({
    empleadosAusentesCount: 0,
    nominasTotalMes: 0,
    solicitudesPendientes: 0,
    productosCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdminStats = async () => {
      try {
        if (!solicitudesVacaciones) {
        setLoading(true);
        await loadSolicitudes()
        // ✅ Cálculos simples para el dashboard
        const now = new Date();
        const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const solicitudesPendientes=(solicitudesVacaciones.map(solicitud=>solicitud.estado=='pendiente')).length
        
        setStats({
          empleadosCount: empleadosSnap.data().count,
          solicitudesPendientes: solicitudesPendientes,
          nominasTotalMes: 0, 
        });
      }

      } catch (error) {
        console.error('Error cargando stats admin:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminStats();
  }, []);

  return { ...stats, loading };
};
