// stores/ausenciasStore.js

import { create } from 'zustand';
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy, setDoc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthStore } from './authStore';
import { formatYMD, esFechaPasadaOHoy } from '../utils/dateUtils';
import { useVacacionesStore } from './vacacionesStore';

export const useAusenciasStore = create((set, get) => {
  let unsubscribeAusencias = null;
  let unsubscribeConfig = null;

  return {
    // Estado principal
    ausencias: [],
    loading: false,
    error: null,
    configAusencias: null,

    // Motivos predefinidos para los desplegables
    motivosPermisos: [
      'Hospitalización',
      'Operación Menor',
      'Muerte de familiar',
      'Prueba Médica',
      'Lactancia',
      'Matrimonio',
      'Mudanza',
      'Deberes inexcusables',
      'Otros'
    ],

    motivosBajas: [
      'Enfermedad',
      'Operación',
      'Accidente',
      'Paternidad/Maternidad',
      'Otros'
    ],

    // Cargar configuración de ausencias
    loadConfigAusencias: () => {
      try {
        if (unsubscribeConfig) { 
          unsubscribeConfig(); 
          unsubscribeConfig = null; 
        }

        const ref = doc(db, 'CONFIG', 'AUSENCIAS_CONFIG');
        
        unsubscribeConfig = onSnapshot(ref, (snap) => {
          set({ configAusencias: snap.exists() ? snap.data() : null });
        }, (error) => {
          console.error('Error cargando config ausencias:', error);
          set({ configAusencias: null });
        });

        return () => { 
          if (unsubscribeConfig) { 
            unsubscribeConfig(); 
            unsubscribeConfig = null; 
          } 
        };
      } catch (e) {
        console.error('Error init config ausencias:', e);
        set({ configAusencias: null });
        return () => {};
      }
    },

    // Actualizar configuración de ausencias
    updateConfigAusencias: async (nuevo) => {
      try {
        const ref = doc(db, 'CONFIG', 'AUSENCIAS_CONFIG');
        const payload = {
          ...nuevo,
          meta: {
            updatedBy: useAuthStore.getState().user?.email || 'system',
            updatedAt: new Date()
          }
        };
        await setDoc(ref, payload, { merge: true });
        return true;
      } catch (e) {
        set({ error: e.message });
        throw e;
      }
    },


    // Cargar ausencias (con o sin filtro por usuario)
    loadAusencias: (userEmail = null) => {
      const { isAuthenticated, user, isAdminOrOwner } = useAuthStore.getState();
      
      if (!isAuthenticated || !user) {
        set({ ausencias: [], error: "Sin permisos para acceder a ausencias" });
        return () => {};
      }

      if (unsubscribeAusencias) {
        unsubscribeAusencias();
        unsubscribeAusencias = null;
      }

      set({ loading: true });

      let ausenciasQuery;

      if (userEmail) {
        // Cargar solo las ausencias del usuario específico
        ausenciasQuery = query(
          collection(db, 'AUSENCIAS'),
          where('solicitante', '==', userEmail),
          orderBy('fechaSolicitud', 'desc')
        );
      } else if (isAdminOrOwner()) {
        // Admin: cargar todas las ausencias
        ausenciasQuery = query(
          collection(db, 'AUSENCIAS'),
          orderBy('fechaSolicitud', 'desc')
        );
      } else {
        set({ loading: false });
        return () => {};
      }

      unsubscribeAusencias = onSnapshot(
        ausenciasQuery,
        (snapshot) => {
          const ausencias = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          set({
            ausencias,
            loading: false,
            error: null
          });
        },
        (error) => {
          console.error('Error en listener ausencias:', error);
          set({ error: error.message, loading: false });
        }
      );

      return () => {
        if (unsubscribeAusencias) {
          unsubscribeAusencias();
          unsubscribeAusencias = null;
        }
      };
    },

    // ============================================
    // FUNCIONES PARA CALENDARIO DE AUSENCIAS
    // ============================================

    // Cargar ausencias aprobadas de todos los empleados para un año específico
    loadAusenciasAprobadas: async (año = new Date().getFullYear()) => {
      try {
        const { isAdminOrOwner } = useAuthStore.getState();
        
        if (!isAdminOrOwner) {
          console.log('Sin permisos de administración para acceder a ausencias aprobadas');
          return [];
        }
        
        // Query directo a Firestore para ausencias aprobadas
        const ausenciasQuery = query(
          collection(db, 'AUSENCIAS'),
          where('estado', '==', 'aprobado'),
          orderBy('fechaSolicitud', 'desc')
        );
        
        const querySnapshot = await getDocs(ausenciasQuery);
        const ausenciasAprobadas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filtrar por año si se especifica
        const ausenciasFiltradas = ausenciasAprobadas.filter(ausencia => {
          return ausencia.fechasActuales?.some(fecha => {
            const fechaAño = new Date(fecha).getFullYear();
            return fechaAño === año;
          });
        });
        
        // Ordenar por la primera fecha actual
        return ausenciasFiltradas.sort((a, b) => {
          const fechaA = a.fechasActuales?.[0]
          const fechaB = b.fechasActuales?.[0]
          return new Date(fechaA) - new Date(fechaB);
        });
        
      } catch (error) {
        console.error('Error cargando ausencias aprobadas:', error);
        set({ error: error.message });
        return [];
      }
    },

    // Combinar vacaciones + ausencias para el calendario
    getAusenciasCombinadas: async (año = new Date().getFullYear()) => {
      try {
        // 1. Cargar vacaciones desde vacacionesStore
        const { loadVacacionesAprobadas } = useVacacionesStore.getState();
        const vacaciones = await loadVacacionesAprobadas(año);
        
        // 2. Cargar ausencias (bajas + permisos)
        const ausencias = await get().loadAusenciasAprobadas(año);
        
        // 3. Clasificar ausencias por tipo
        const bajas = ausencias.filter(a => a.tipo === 'baja');
        const permisos = ausencias.filter(a => a.tipo === 'permiso');
        
        // 4. Agregar campo tipoAusencia para facilitar identificación
        return {
          vacaciones: vacaciones.map(v => ({ ...v, tipoAusencia: 'vacaciones' })),
          bajas: bajas.map(b => ({ ...b, tipoAusencia: 'baja' })),
          permisos: permisos.map(p => ({ ...p, tipoAusencia: 'permiso' })),
          todas: [
            ...vacaciones.map(v => ({ ...v, tipoAusencia: 'vacaciones' })),
            ...bajas.map(b => ({ ...b, tipoAusencia: 'baja' })),
            ...permisos.map(p => ({ ...p, tipoAusencia: 'permiso' }))
          ]
        };
        
      } catch (error) {
        console.error('Error obteniendo ausencias combinadas:', error);
        return { vacaciones: [], bajas: [], permisos: [], todas: [] };
      }
    },

    // Obtener ausencias de un día específico
    getAusenciasPorDia: (fecha, ausenciasCombinadas) => {
      if (!ausenciasCombinadas?.todas) return [];
      
      return ausenciasCombinadas.todas.filter(ausencia => {
        return ausencia.fechasActuales?.includes(fecha);
      });
    },

    // Contar ausencias por día (para heatmap)
    contarAusenciasPorDia: (fecha, ausenciasCombinadas) => {
      const ausenciasDia = get().getAusenciasPorDia(fecha, ausenciasCombinadas);
      
      return {
        total: ausenciasDia.length,
        vacaciones: ausenciasDia.filter(a => a.tipoAusencia === 'vacaciones').length,
        bajas: ausenciasDia.filter(a => a.tipoAusencia === 'baja').length,
        permisos: ausenciasDia.filter(a => a.tipoAusencia === 'permiso').length
      };
    },



    // Evaluar auto-aprobación según configuración
    evaluarAutoAprobacion: (ausencia) => {
      // LAS BAJAS SIEMPRE SE AUTO-APRUEBAN (justificante médico obligatorio)
      if (ausencia.tipo === 'baja') {
        return { aplicar: true, motivo: 'Bajas médicas se aprueban automáticamente' };
      }

      // PERMISOS: dependen de la configuración
      const { configAusencias } = get();
      if (!configAusencias?.autoAprobar?.habilitado) {
        return { aplicar: false, motivo: 'Auto-aprobación de permisos deshabilitada' };
      }

      // Si la auto-aprobación está habilitada, aprobar permisos
      return { aplicar: true, motivo: 'Auto-aprobación de permisos activada' };
    },


    // Crear nueva ausencia
    crearAusencia: async (ausenciaData, esAdmin = false) => {
      try {
        const { userProfile, sendNotification } = useAuthStore.getState();
        
        // Si es admin, NO evaluar auto-aprobación, siempre aprobar
        let estadoFinal;
        let comentariosAdminFinal;
        let fechaAprobacion;
        
        if (esAdmin) {
          // Admin crea ausencia → siempre aprobada
          estadoFinal = 'aprobado';
          comentariosAdminFinal = ausenciaData.comentariosAdmin || 'Ausencia registrada por administración';
          fechaAprobacion = formatYMD(new Date());
        } else {
          // Empleado crea ausencia → evaluar auto-aprobación
          const resAuto = get().evaluarAutoAprobacion(ausenciaData);
          estadoFinal = resAuto.aplicar ? 'aprobado' : 'pendiente';
          comentariosAdminFinal = ausenciaData.tipo==="baja" 
          
          ? 'Baja registrada correctamente.'          
          : resAuto.aplicar 
            ? (get().configAusencias?.autoAprobar?.mensaje || 'Aprobado automáticamente por política activa.') 
            : '';
          fechaAprobacion = resAuto.aplicar ? formatYMD(new Date()) : '';
        }
        
        const nuevaAusencia = {
          ...ausenciaData,
          fechasActuales: [...ausenciaData.fechas],
          fechaSolicitud: formatYMD(new Date()),
          estado: estadoFinal,
          comentariosAdmin: comentariosAdminFinal,
          fechaAprobacionDenegacion: fechaAprobacion,
          ediciones: [],
          cancelaciones: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const nuevaRef = doc(collection(db, 'AUSENCIAS'));
        await setDoc(nuevaRef, nuevaAusencia);

        // Notificaciones
        try {
          if (esAdmin) {
            // Admin creó ausencia → notificar al empleado
            await sendNotification({
              empleadoEmail: ausenciaData.solicitante,
              title: `✅ ${ausenciaData.tipo === 'baja' ? 'Baja registrada' : 'Permiso registrado'} por administración`,
              body: `Se te ha registrado ${ausenciaData.tipo === 'baja' ? 'una' : 'un'} ${ausenciaData.tipo} de ${ausenciaData.fechas.length} día(s).\n(${ausenciaData.motivo})`,
              url: '/ausencias/MisAusencias',
              type: 'ausencia_creada_admin'
            });
          } else if (estadoFinal === 'aprobado') {
            // Auto-aprobado → notificar empleado
            await sendNotification({
              empleadoEmail: ausenciaData.solicitante,
              title: `✅ ${ausenciaData.tipo === 'baja' ? 'Baja registrada' : 'Permiso registrado'}  automáticamente`,
              body: `Tu ${ausenciaData.tipo} de ${ausenciaData.fechas.length} día(s) ha sido ${ausenciaData.tipo === 'baja' ? 'registrada' : 'registrado'} correctamente.`,
              url: '/ausencias/MisAusencias',
              type: 'ausencia_aprobada_auto'
            });
          } else {
            // Pendiente → notificar a admins
            const { formatearNombre } = await import('../components/Helpers');
            const { userProfile } = useAuthStore.getState();
            const nombreSolicitante = formatearNombre(userProfile?.nombre || ausenciaData.solicitante);
            
            await fetch('/.netlify/functions/notifyAdmins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                solicitante: ausenciaData.solicitante,
                nombreSolicitante: nombreSolicitante,
                tipo: ausenciaData.tipo,
                motivo: ausenciaData.motivo,
                diasSolicitados: ausenciaData.fechas.length,
                accion: 'nueva_ausencia',
                mensaje: `${nombreSolicitante} ha solicitado un ${ausenciaData.tipo} de ${ausenciaData.fechas.length} día(s).\n📋 Motivo: ${ausenciaData.motivo}`
              })
            });
          }
        } catch (notifError) {
          console.error('Error enviando notificación:', notifError);
        }

        return nuevaRef.id;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    // Actualizar ausencia existente (solo pendientes)
    actualizarAusencia: async (ausenciaId, datosActualizados, ausenciaOriginal) => {
      try {
        if (ausenciaOriginal.estado !== 'pendiente') {
          throw new Error('Solo se pueden editar ausencias pendientes');
        }

        // Re-evaluar auto-aprobación
        const ausenciaTemp = {
          ...ausenciaOriginal,
          ...datosActualizados,
          id: ausenciaId,
          estado: 'pendiente'
        };

        const resAuto = get().evaluarAutoAprobacion(ausenciaTemp);

        const datosFinales = {
          ...datosActualizados,
          fechaEdicion: formatYMD(new Date()),
          updatedAt: new Date(),
          estado: resAuto.aplicar ? 'aprobado' : 'pendiente',
          comentariosAdmin: resAuto.aplicar 
            ? (get().configAusencias?.autoAprobar?.mensaje || 'Aprobado automáticamente por política activa.') 
            : '',
          fechaAprobacionDenegacion: resAuto.aplicar ? formatYMD(new Date()) : ''
        };

        const ausenciaRef = doc(db, 'AUSENCIAS', ausenciaId);
        await updateDoc(ausenciaRef, datosFinales);

        return true;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    // Cambiar estado de ausencia (admin)
    cambiarEstadoAusencia: async (ausenciaId, nuevoEstado, comentariosAdmin, ausencia) => {
      try {
        const { isAdminOrOwner } = useAuthStore.getState();
        
        if (!isAdminOrOwner()) {
          throw new Error('Sin permisos para cambiar estado de ausencias');
        }

        const ausenciaRef = doc(db, 'AUSENCIAS', ausenciaId);

        const updateData = {
          estado: nuevoEstado,
          comentariosAdmin: comentariosAdmin || '',
          fechaAprobacionDenegacion: formatYMD(new Date()),
          updatedAt: new Date()
        };

        await updateDoc(ausenciaRef, updateData);

        // Notificar al solicitante
        try {
          const { sendNotification } = useAuthStore.getState();
          
          if (nuevoEstado === 'aprobado') {
            await sendNotification({
              empleadoEmail: ausencia.solicitante,
              title: `✅ ${ausencia.tipo === 'baja' ? 'Baja aprobada' : 'Permiso aprobado'}`,
              body: `Tu solicitud de ${ausencia.tipo} (${ausencia.motivo}) ha sido aprobada`,
              url: '/ausencias/MisAusencias',
              type: 'ausencia_aprobada'
            });
          } else if (nuevoEstado === 'rechazado') {
            await sendNotification({
              empleadoEmail: ausencia.solicitante,
              title: `❌ ${ausencia.tipo === 'baja' ? 'Baja rechazada' : 'Permiso rechazado'}`,
              body: comentariosAdmin || `Tu solicitud de ${ausencia.tipo} ha sido rechazada`,
              url: '/ausencias/MisAusencias',
              type: 'ausencia_rechazada'
            });
          }
        } catch (notifError) {
          console.error('Error enviando notificación:', notifError);
        }

        return true;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    // Obtener ausencia completa por ID
    obtenerAusenciaCompleta: async (ausenciaId) => {
      try {
        const ausenciaDoc = await getDoc(doc(db, 'AUSENCIAS', ausenciaId));
        if (!ausenciaDoc.exists()) {
          throw new Error('Ausencia no encontrada');
        }
        return { id: ausenciaDoc.id, ...ausenciaDoc.data() };
      } catch (error) {
        console.error('Error obteniendo ausencia:', error);
        throw error;
      }
    },

    // Obtener lista de empleados con ausencias pendientes
    obtenerEmpleadosConAusencias: () => {
    const { ausencias } = get();
    const pendientes = ausencias.filter(a => a.estado === 'pendiente');
    return [...new Set(pendientes.map(a => a.solicitante))].sort();
    },

    // Obtener lista de puestos con ausencias
    obtenerPuestosConAusencias: () => {
    return [
          'Todos', 
          'Fresador',
          'Tornero', 
          'Operario CNC',
          'Administrativo',
          'Diseñador',
          'Montador',
          'Ayudante de Taller'
        ];
    },

    // Añadir días a una ausencia existente
    añadirDiasAusencia: async (ausenciaId, nuevasFechas, motivoEdicion, ausenciaOriginal, esAdmin) => {
      try {
        const { userProfile} = useAuthStore.getState();
        
        // Validar que haya nuevas fechas
        if (!nuevasFechas || nuevasFechas.length === 0) {
          throw new Error('Debes añadir al menos una fecha nueva');
        }
        
        // Combinar fechasActuales con las nuevas (sin duplicados)
        const fechasActualizadas = [...new Set([...ausenciaOriginal.fechasActuales, ...nuevasFechas])];

        
        const nuevaEdicion = {
          fechaEdicion: formatYMD(new Date()),
          fechasAgregadas: nuevasFechas,
          motivoEdicion: motivoEdicion || '',
          editadoPor: userProfile?.nombre || 'unknown'
        };
        
        const ausenciaRef = doc(db, 'AUSENCIAS', ausenciaId);
        await updateDoc(ausenciaRef, {
          fechasActuales: fechasActualizadas,
          ediciones: [...(ausenciaOriginal.ediciones || []), nuevaEdicion],
          updatedAt: new Date()
        });
        
        // Notificar según quién editó
        try {
          const { sendNotification, userProfile } = useAuthStore.getState();
          const { formatearNombre } = await import('../components/Helpers');
          
          if (esAdmin) {
            // Admin editó → notificar al empleado
            await sendNotification({
              empleadoEmail: ausenciaOriginal.solicitante,
              title: `📝 ${ausenciaOriginal.tipo === 'baja' ? 'Baja' : 'Permiso'} modificado por administración`,
              body: `Se añadieron ${nuevasFechas.length} día(s) a tu ${ausenciaOriginal.tipo}`,
              url: '/ausencias/MisAusencias',
              type: 'ausencia_editada_admin'
            });
          } else {
            // Empleado añadió días → notificar a admins
            const nombreSolicitante = formatearNombre(userProfile?.nombre || ausenciaOriginal.solicitante);
            
            await fetch('/.netlify/functions/notifyAdmins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                solicitante: ausenciaOriginal.solicitante,
                nombreSolicitante: nombreSolicitante,
                tipo: ausenciaOriginal.tipo,
                motivo: ausenciaOriginal.motivo,
                diasSolicitados: nuevasFechas.length,
                accion: 'edicion_ausencia',
                mensaje: `${nombreSolicitante} ha añadido ${nuevasFechas.length} día(s) a su ${ausenciaOriginal.tipo}.\n💬 Motivo: ${motivoEdicion || 'No especificado'}`
              })
            });
          }
        } catch (notifError) {
          console.error('Error enviando notificación:', notifError);
        }
        
        return true;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

        // Cancelar días específicos de una ausencia (parcial o total)
    cancelarDiasAusencia: async (ausenciaId, diasACancelar, motivoCancelacion, ausencia, esAdmin=false) => {
      try {
        const { userProfile } = useAuthStore.getState();
        
        if (!motivoCancelacion || motivoCancelacion.trim() === '') {
          throw new Error('Debes proporcionar un motivo para la cancelación');
        }
        
        if (!diasACancelar || diasACancelar.length === 0) {
          throw new Error('Debes seleccionar al menos un día para cancelar');
        }
        
        const fechasRestantes = ausencia.fechasActuales.filter(f => !diasACancelar.includes(f));
        const esCancelacionTotal = fechasRestantes.length === 0;
        
        // Crear objeto de cancelación (mismo formato para parcial y total)
        const nuevaCancelacion = {
          fechaCancelacion: formatYMD(new Date()),
          diasCancelados: diasACancelar,
          motivoCancelacion: motivoCancelacion.trim(),
          canceladoPor: userProfile?.nombre || 'unknown',
          esCancelacionTotal: esCancelacionTotal // ⬅️ Indicador para el historial
        };
        
        const ausenciaRef = doc(db, 'AUSENCIAS', ausenciaId);
        
        // Actualizar documento (misma lógica para parcial y total)
        await updateDoc(ausenciaRef, {
          estado: esCancelacionTotal ? 'cancelado' : ausencia.estado, // Solo cambiar estado si es total
          fechasActuales: fechasRestantes,
          cancelaciones: [...(ausencia.cancelaciones || []), nuevaCancelacion],
          updatedAt: new Date()
        });
        
        // Notificaciones
        try {
          const { sendNotification, userProfile } = useAuthStore.getState();
          const { formatearNombre } = await import('../components/Helpers');
          const nombreSolicitante = formatearNombre(userProfile?.nombre || ausencia.solicitante);
          
          if (esAdmin && ausencia.solicitante !== userProfile?.email) {
            // Admin canceló → notificar al empleado
            await sendNotification({
              empleadoEmail: ausencia.solicitante,
              title: `⚠️ ${ausencia.tipo === 'baja' ? 'Baja' : 'Permiso'} ${esCancelacionTotal ? 'cancelado' : 'modificado'}`,
              body: `${esCancelacionTotal ? 'Tu ausencia ha sido cancelada completamente' : `Se cancelaron ${diasACancelar.length} día(s) de tu ${ausencia.tipo}`} por el administrador.\n💬 Motivo: ${motivoCancelacion}`,
              url: '/ausencias/solicitudes',
              type: esCancelacionTotal ? 'ausencia_cancelada_total_admin' : 'ausencia_cancelada_parcial_admin'
            });
          } else {
            // Empleado canceló → notificar a admins
            await fetch('/.netlify/functions/notifyAdmins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                solicitante: ausencia.solicitante,
                nombreSolicitante: nombreSolicitante,
                tipo: ausencia.tipo,
                motivo: ausencia.motivo,
                accion: esCancelacionTotal ? 'cancelacion_total_ausencia' : 'cancelacion_parcial_ausencia',
                mensaje: `${nombreSolicitante} ha ${esCancelacionTotal ? 'cancelado completamente' : 'cancelado parcialmente'} su ${ausencia.tipo}.\n📅 Días cancelados: ${diasACancelar.length}\n💬 Motivo: ${motivoCancelacion}`
              })
            });
          }
        } catch (notifError) {
          console.error('Error enviando notificación:', notifError);
        }
        
        return true;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    // Eliminar ausencia completamente (solo si no tiene días pasados)
    eliminarAusencia: async (ausenciaId, ausencia, esAdmin=false) => {
      try {
        
        // Verificar que no tenga días pasados
        const tieneDiasPasados = ausencia.fechasActuales.some(f => esFechaPasadaOHoy(f));
        if (tieneDiasPasados && !esAdmin) {
          throw new Error('No se puede eliminar una ausencia con días pasados. Usa cancelar en su lugar.');
        }
        
        const ausenciaRef = doc(db, 'AUSENCIAS', ausenciaId);
        await deleteDoc(ausenciaRef);
        
        // Notificar a admins
        if (!esAdmin) {
        try {
          const { userProfile } = useAuthStore.getState();
          const { formatearNombre } = await import('../components/Helpers');
          const nombreSolicitante = formatearNombre(userProfile?.nombre || ausencia.solicitante);
          
          await fetch('/.netlify/functions/notifyAdmins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              solicitante: ausencia.solicitante,
              nombreSolicitante: nombreSolicitante,
              tipo: ausencia.tipo,
              motivo: ausencia.motivo,
              accion: 'eliminacion_ausencia',
              mensaje: `${nombreSolicitante} ha eliminado su solicitud de ${ausencia.tipo} (${ausencia.motivo}).`
            })
          });
        } catch (notifError) {
          console.error('Error enviando notificación:', notifError);
        }
        
        return true;
      }
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    // Obtener el estado real de cada fecha considerando el orden temporal
    calcularEstadoRealFechas: (ausencia) => {
      if (!ausencia.fechas) return { activas: [], canceladas: [], agregadas: [] };
      
      // Crear un registro temporal con todas las fechas originales
      const registroFechas = {};
      
      ausencia.fechas.forEach(fecha => {
        registroFechas[fecha] = {
          estado: 'original',
          ultimaAccion: ausencia.fechaSolicitud || '1970-01-01',
          accionTipo: 'solicitud'
        };
      });
      
      // Crear un array con TODAS las acciones (ediciones y cancelaciones) ordenadas cronológicamente
      const todasLasAcciones = [];
      
      // Añadir ediciones
      if (ausencia.ediciones && ausencia.ediciones.length > 0) {
        ausencia.ediciones.forEach(edicion => {
          todasLasAcciones.push({
            tipo: 'edicion',
            fecha: edicion.fechaEdicion,
            fechasAfectadas: edicion.fechasAgregadas
          });
        });
      }
      
      // Añadir cancelaciones
      if (ausencia.cancelaciones && ausencia.cancelaciones.length > 0) {
        ausencia.cancelaciones.forEach(cancelacion => {
          todasLasAcciones.push({
            tipo: 'cancelacion',
            fecha: cancelacion.fechaCancelacion,
            fechasAfectadas: cancelacion.diasCancelados
          });
        });
      }
      
      // Ordenar TODAS las acciones cronológicamente
      todasLasAcciones.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      
      // Procesar las acciones en orden cronológico
      todasLasAcciones.forEach(accion => {
        accion.fechasAfectadas.forEach(fecha => {
          if (accion.tipo === 'edicion') {
            // AÑADIR fecha
            if (!registroFechas[fecha]) {
              // Fecha completamente nueva
              registroFechas[fecha] = {
                estado: 'agregada',
                ultimaAccion: accion.fecha,
                accionTipo: 'edicion'
              };
            } else if (registroFechas[fecha].estado === 'cancelada') {
              // Reactivar fecha previamente cancelada
              registroFechas[fecha] = {
                estado: 'reactivada',
                ultimaAccion: accion.fecha,
                accionTipo: 'edicion'
              };
            }
            // Si ya existe y no está cancelada, no hacer nada (ya está activa)
          } else if (accion.tipo === 'cancelacion') {
            // CANCELAR fecha
            if (registroFechas[fecha]) {
              // Marcar como cancelada (sobrescribe cualquier estado anterior)
              registroFechas[fecha] = {
                estado: 'cancelada',
                ultimaAccion: accion.fecha,
                accionTipo: 'cancelacion'
              };
            } else {
              // Fecha que no conocíamos (por si acaso)
              registroFechas[fecha] = {
                estado: 'cancelada',
                ultimaAccion: accion.fecha,
                accionTipo: 'cancelacion'
              };
            }
          }
        });
      });
      
      // Clasificar fechas según su estado final
      const activas = [];
      const canceladas = [];
      const agregadas = [];
      
      Object.entries(registroFechas).forEach(([fecha, info]) => {
        if (info.estado === 'cancelada') {
          canceladas.push(fecha);
        } else if (info.estado === 'agregada') {
          agregadas.push(fecha);
        } else if (info.estado === 'reactivada' || info.estado === 'original') {
          activas.push(fecha);
        }
      });
      
      return { activas, canceladas, agregadas };
    },


    // Utilidades para obtener días cancelados y editados
    obtenerDiasCancelados: (cancelaciones) => {
      if (!cancelaciones || cancelaciones.length === 0) return [];
      return cancelaciones.flatMap(c => c.diasCancelados);
    },

    obtenerDiasAgregados: (ediciones) => {
      if (!ediciones || ediciones.length === 0) return [];
      return ediciones.flatMap(e => e.fechasAgregadas);
    },

    // Obtener días disponibles para cancelar (solo futuros de fechasActuales)
    obtenerDiasDisponiblesParaCancelar: (ausencia) => {
      if (!ausencia.fechasActuales) return [];
      return ausencia.fechasActuales.filter(f => !esFechaPasadaOHoy(f));
    },

    // Verificar si ausencia tiene días pasados
    tieneDiasPasados: (ausencia) => {
      if (!ausencia.fechasActuales) return false;
      return ausencia.fechasActuales.some(f => esFechaPasadaOHoy(f));
    },

    // Calcular días totales (originales vs actuales)
    calcularDiasTotales: (ausencia) => {
      return {
        originales: ausencia.fechas?.length || 0,
        actuales: ausencia.fechasActuales?.length || 0,
        cancelados: get().obtenerDiasCancelados(ausencia.cancelaciones).length,
        agregados: get().obtenerDiasAgregados(ausencia.ediciones).length
      };
    },

    // Guardar/actualizar penalización por bajas
    guardarPenalizacion: async (año, empleadoEmail, diasBajaTotales, penalizacionAplicada) => {
      try {
        const { userProfile } = useAuthStore.getState();
        const penalizacionesRef = doc(db, 'PENALIZACIONES', año.toString());
        const docSnap = await getDoc(penalizacionesRef);

        const nuevaPenalizacion = {
          email: empleadoEmail,
          diasBajaTotales: diasBajaTotales,
          penalizacionAplicada: penalizacionAplicada, // Total acumulado en horas
          aplicadoPor: userProfile?.email || 'admin',
          fechaAplicacion: formatYMD(new Date()),
          timestamp: new Date()
        };

        if (docSnap.exists()) {
          // Actualizar array existente
          const penalizaciones = docSnap.data().penalizaciones || [];
          const index = penalizaciones.findIndex(p => p.email === empleadoEmail);
          
          if (index >= 0) {
            penalizaciones[index] = nuevaPenalizacion; // Actualizar
          } else {
            penalizaciones.push(nuevaPenalizacion); // Añadir nuevo
          }
          
          await updateDoc(penalizacionesRef, { penalizaciones });
        } else {
          // Crear documento nuevo
          await setDoc(penalizacionesRef, {
            año: parseInt(año),
            penalizaciones: [nuevaPenalizacion]
          });
        }

        return true;
      } catch (error) {
        console.error('Error guardando penalización:', error);
        throw error;
      }
    },

    // Obtener penalizaciones de un año
    obtenerPenalizaciones: async (año) => {
      try {
        const penalizacionesRef = doc(db, 'PENALIZACIONES', año.toString());
        const docSnap = await getDoc(penalizacionesRef);
        
        if (docSnap.exists()) {
          return docSnap.data().penalizaciones || [];
        }
        return [];
      } catch (error) {
        console.error('Error obteniendo penalizaciones:', error);
        return [];
      }
    },

    // Escuchar cambios en penalizaciones de un año (onSnapshot)
    loadPenalizacionesYear: (año, callback) => {
      try {
        const penalizacionesRef = doc(db, 'PENALIZACIONES', año.toString());
        
        const unsubscribe = onSnapshot(
          penalizacionesRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const penalizaciones = docSnap.data().penalizaciones || [];
              callback(penalizaciones);
            } else {
              callback([]);
            }
          },
          (error) => {
            console.error('Error en listener de penalizaciones:', error);
            callback([]);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('Error configurando listener de penalizaciones:', error);
        return () => {};
      }
    },


    // Limpiar listeners al desmontar
    cleanup: () => {
      if (unsubscribeAusencias) {
        unsubscribeAusencias();
        unsubscribeAusencias = null;
      }
      if (unsubscribeConfig) {
        unsubscribeConfig();
        unsubscribeConfig = null;
      }
    }
  };
});
