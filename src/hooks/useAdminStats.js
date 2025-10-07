// hooks/useAdminStats.js
import { useState, useEffect, useRef } from 'react';
import { useVacacionesStore } from '../stores/vacacionesStore';
import { formatYMD } from '../utils/dateUtils';
import { useUIStore } from '../stores/uiStore';
import { addDays } from 'date-fns';


export const useAdminStats = () => {
  const {
    configVacaciones,
    solicitudesVacaciones,
    loadSolicitudesVacaciones,
    loadConfigVacaciones,
    obtenerDiasCancelados
  } = useVacacionesStore();
  const {showError, showInfo} = useUIStore();

  const [stats, setStats] = useState({
    trabajadoresVacacionesHoy: 0,
    trabajadoresVacacionesMañana: 0,
    solicitudesPendientes: 0,
    autoAprobacionActiva: false,
    loadingStats: true
  });

  // Cargar datos al montar 
  useEffect(() => {
  const unsub1 = loadSolicitudesVacaciones();
  const unsub2 = loadConfigVacaciones();
  
  return () => {
    if (typeof unsub1 === 'function') unsub1();
    if (typeof unsub2 === 'function') unsub2();
  };
  }, []); 

  // Calcular estadísticas cuando cambien los datos
  useEffect(() => {
    const calcularStats = () => {
      try {
        const hoy = formatYMD(new Date());
        const mañana = formatYMD(addDays(new Date(), 1));

        // Filtrar solo solicitudes aprobadas
        const solicitudesAprobadas = solicitudesVacaciones.filter(
          (sol) => sol.estado === 'aprobada'
        );

        // Contar trabajadores de vacaciones HOY
        const trabajadoresHoy = new Set(
          solicitudesAprobadas
            .filter((s) => Array.isArray(s.fechas) && s.fechas.includes(hoy))
            .filter((s) => {
              const cancelados = obtenerDiasCancelados(s.cancelacionesParciales || []);
              return !cancelados.includes(hoy);
            })
            .map((s) => s.solicitante)
        ).size;

        // Contar trabajadores de vacaciones MAÑANA
        const trabajadoresMañana = new Set(
          solicitudesAprobadas
            .filter((s) => Array.isArray(s.fechas) && s.fechas.includes(mañana))
            .filter((s) => {
              const cancelados = obtenerDiasCancelados(s.cancelacionesParciales || []);
              return !cancelados.includes(mañana);
            })
            .map((s) => s.solicitante)
        ).size;

        // Contar solicitudes pendientes
        const pendientes = solicitudesVacaciones.filter(
          (sol) => sol.estado === 'pendiente'
        ).length;

        // Estado de auto-aprobación
        const autoAprobacion = configVacaciones?.autoAprobar?.habilitado || false;

        setStats({
          trabajadoresVacacionesHoy: trabajadoresHoy,
          trabajadoresVacacionesMañana: trabajadoresMañana,
          solicitudesPendientes: pendientes,
          autoAprobacionActiva: autoAprobacion,
          loadingStats: false
        });
      } catch (error) {
        showError('Error calculando estadísticas admin:', error);
        setStats((prev) => ({ ...prev, loadingStats: false }));
      }
    };

    // Solo calcular si ya tenemos datos
if (Array.isArray(solicitudesVacaciones) && solicitudesVacaciones.length >= 0 && configVacaciones !== null) {
  calcularStats();}

  }, [solicitudesVacaciones, configVacaciones]);

  return stats;
};
