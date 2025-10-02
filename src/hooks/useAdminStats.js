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
    loadSolicitudesConCancelaciones,
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
  const [solicitudesFuente, setSolicitudesFuente] = useState([]);
  const intervalRef = useRef(null);

  // Cargar datos al montar y configurar recarga periódica
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const todas = await loadSolicitudesConCancelaciones();
        setSolicitudesFuente(Array.isArray(todas) ? todas : []);
      } catch (error) {
        showError('Error cargando solicitudes para stats:', error);
      }
    };

    // Carga inicial inmediata
    cargarDatos();
    loadSolicitudesVacaciones(); // Este ya tiene onSnapshot interno
    loadConfigVacaciones(); // Este ya tiene onSnapshot interno

    // Configurar recarga periódica cada 3 minutos (180000 ms)
    intervalRef.current = setInterval(() => {
      showInfo('🔄 Recargando stats automáticamente...');
      cargarDatos();
    }, 120000);

    // Cleanup al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Sin dependencias: se ejecuta solo al montar/desmontar

  // Calcular estadísticas cuando cambien los datos
  useEffect(() => {
    const calcularStats = () => {
      try {
        const hoy = formatYMD(new Date());
        const mañana = formatYMD(addDays(new Date(), 1));

        // Filtrar solo solicitudes aprobadas
        const solicitudesAprobadas = solicitudesFuente.filter(
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
    if (solicitudesFuente && configVacaciones !== null) {
      calcularStats();
    }
  }, [solicitudesVacaciones, configVacaciones, obtenerDiasCancelados, solicitudesFuente]);

  return stats;
};
