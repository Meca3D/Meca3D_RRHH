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
  } = useVacacionesStore();

  const {configAusencias, loadConfigAusencias, ausencias, loadAusencias} = useAusenciasStore();
  const {showError} = useUIStore();

  const [stats, setStats] = useState({
    trabajadoresAusentesHoy: 0,
    trabajadoresAusentesMañana: 0,
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
        // Función auxiliar para contar empleados únicos ausentes en una fecha
        const contarAusentesEnFecha = (fechaCheck) => {
          const trabajadoresAusentes = new Set();

        // 1. Revisar VACACIONES
          solicitudesVacaciones.forEach(sol => {
            if (sol.estado === 'aprobada' && Array.isArray(sol.fechasActuales)) {
              if (sol.fechasActuales.includes(fechaCheck)) {
                trabajadoresAusentes.add(sol.solicitante);
              }
            }
          });

          // 2. Revisar AUSENCIAS (Bajas y Permisos)
          ausencias.forEach(aus => {           
            if (aus.estado==='aprobado' && Array.isArray(aus.fechasActuales)) {
              if (aus.fechasActuales.includes(fechaCheck)) {
                trabajadoresAusentes.add(aus.solicitante);
              }
            }
          });

          return trabajadoresAusentes.size;
        };

        const trabajadoresHoy = contarAusentesEnFecha(hoy);
        const trabajadoresMañana = contarAusentesEnFecha(mañana);

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
          trabajadoresAusentesHoy: trabajadoresHoy,
          trabajadoresAusentesMañana: trabajadoresMañana,
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
