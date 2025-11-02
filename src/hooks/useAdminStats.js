// hooks/useAdminStats.js
import { useState, useEffect } from 'react';
import { useVacacionesStore } from '../stores/vacacionesStore';
import { useAusenciasStore } from '../stores/ausenciasStore';
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

  const {configAusencias, loadConfigAusencias, ausencias, loadAusencias} = useAusenciasStore();
  const {showError} = useUIStore();

  const [stats, setStats] = useState({
    trabajadoresVacacionesHoy: 0,
    trabajadoresVacacionesMañana: 0,
    solicitudesPendientes: 0,
    permisosPendientes:0,
    autoAprobacionActiva: false,
    loadingStats: true
  });

  useEffect(() => {
    if (!configVacaciones){
    const unsubscribe = loadConfigVacaciones();
    return () => unsubscribe();} // Cleanup al desmontar
  }, [loadConfigVacaciones, configVacaciones]);

  useEffect(() => {
    if (!configAusencias){
    const unsubscribe = loadConfigAusencias();
    return () => unsubscribe();} // Cleanup al desmontar
  }, [loadConfigAusencias, configAusencias]);

  // Cargar datos al montar 
  useEffect(() => {
  const unsub1 = loadSolicitudesVacaciones();
  const unsub2 = loadAusencias();
  
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

        // Contar solicitudes pendientes
        const permisosPendientes = ausencias.filter(
          (ausencia) => ausencia.estado === 'pendiente'
        ).length;

        // Estado de auto-aprobación
        const autoAprobacion = configVacaciones?.autoAprobar?.habilitado || false;

        setStats({
          trabajadoresVacacionesHoy: trabajadoresHoy,
          trabajadoresVacacionesMañana: trabajadoresMañana,
          solicitudesPendientes: pendientes,
          permisosPendientes: permisosPendientes,
          autoAprobacionActiva: autoAprobacion,
          loadingStats: false
        });
      } catch (error) {
        showError('Error calculando estadísticas admin:', error);
        setStats((prev) => ({ ...prev, loadingStats: false }));
      }
    };

    // Solo calcular si ya tenemos datos
if (Array.isArray(solicitudesVacaciones) && Array.isArray(ausencias) && ausencias.length>=0 && solicitudesVacaciones.length >= 0 && configVacaciones !== null) {
  calcularStats();}

  }, [solicitudesVacaciones, configVacaciones, ausencias]);

  return stats;
};
