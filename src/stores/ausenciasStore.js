// stores/ausenciasStore.js

import { create } from 'zustand';
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy, setDoc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthStore } from './authStore';
import { formatYMD } from '../utils/dateUtils';

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
      'Prueba Médica',
      'Muerte de familiar',
      'Lactancia',
      'Matrimonio',
      'Mudanza',
      'Deberes inexcusables',
      'Otros'
    ],

    motivosBajas: [
      'Enfermedad',
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

    // Evaluar auto-aprobación según configuración
    evaluarAutoAprobacion: (ausencia) => {
      const { configAusencias } = get();

      if (!configAusencias?.autoAprobar?.habilitado) {
        return { aplicar: false, motivo: 'Auto-aprobación deshabilitada' };
      }

      const modo = configAusencias.autoAprobar.modo;

      // Modo: todas
      if (modo === 'todas') {
        return { aplicar: true, motivo: 'ok' };
      }

      // Modo: solo bajas
      if (modo === 'soloBajas') {
        const aplicar = ausencia.tipo === 'baja';
        return { aplicar, motivo: aplicar ? 'ok' : 'Solo se auto-aprueban bajas' };
      }

      // Modo: solo permisos
      if (modo === 'soloPermisos') {
        const aplicar = ausencia.tipo === 'permiso';
        return { aplicar, motivo: aplicar ? 'ok' : 'Solo se auto-aprueban permisos' };
      }

      return { aplicar: false, motivo: 'Modo no reconocido' };
    },

    // Crear nueva ausencia
    crearAusencia: async (ausenciaData) => {
      try {
        const { user } = useAuthStore.getState();

        // Evaluar auto-aprobación
        const ausenciaTemp = {
          ...ausenciaData,
          id: 'temp',
          estado: 'pendiente',
          fechaSolicitud: formatYMD(new Date())
        };

        const resAuto = get().evaluarAutoAprobacion(ausenciaTemp);

        const nuevaAusencia = {
          ...ausenciaData,
          fechaSolicitud: formatYMD(new Date()),
          estado: resAuto.aplicar ? 'aprobado' : 'pendiente',
          comentariosAdmin: resAuto.aplicar 
            ? (get().configAusencias?.autoAprobar?.mensaje || 'Aprobado automáticamente por política activa.') 
            : '',
          fechaAprobacionDenegacion: resAuto.aplicar ? formatYMD(new Date()) : '',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Crear documento con ID random
        const newAusenciaRef = doc(collection(db, 'AUSENCIAS'));
        await setDoc(newAusenciaRef, nuevaAusencia);

        // Enviar notificaciones
        try {
          const { sendNotification, userProfile } = useAuthStore.getState();
          const { formatearNombre } = await import('../components/Helpers');
          const nombreSolicitante = formatearNombre(userProfile?.nombre || ausenciaData.solicitante);

          if (resAuto.aplicar) {
            // Auto-aprobada: notificar al solicitante
            await sendNotification({
              empleadoEmail: ausenciaData.solicitante,
              title: `✅ ${ausenciaData.tipo === 'baja' ? 'Baja aprobada' : 'Permiso aprobado'}`,
              body: `Tu solicitud de ${ausenciaData.tipo} (${ausenciaData.motivo}) ha sido aprobada`,
              url: '/ausencias/MisAusencias',
              type: 'ausencia_aprobada'
            });

            // Notificar también a admins (info)
            await fetch('/.netlify/functions/notifyAdmins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                solicitante: ausenciaData.solicitante,
                nombreSolicitante: nombreSolicitante,
                tipo: ausenciaData.tipo,
                motivo: ausenciaData.motivo,
                comentariosSolicitante: ausenciaData.comentariosSolicitante,
                diasSolicitados: ausenciaData.fechas.length,
                accion: 'ausencia_auto_aprobada',
                mensaje: `Se a autoaprobado una solicitud de ${ausenciaData.tipo} (${ausenciaData.motivo}).\n\n💬 ${nombreSolicitante}: ${ausenciaData.comentariosSolicitante}`
              })
            });
          } else {
            // Pendiente: notificar a admins para revisión
            await fetch('/.netlify/functions/notifyAdmins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                solicitante: ausenciaData.solicitante,
                nombreSolicitante: nombreSolicitante,
                tipo: ausenciaData.tipo,
                motivo: ausenciaData.motivo,
                comentariosSolicitante: ausenciaData.comentariosSolicitante,
                diasSolicitados: ausenciaData.fechas.length,
                accion: 'nueva_ausencia'
              })
            });
          }
        } catch (notifError) {
          console.error('Error enviando notificaciones:', notifError);
        }

        return newAusenciaRef.id;
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

    // Cancelar ausencia
    cancelarAusencia: async (ausencia, motivoCancelacion, esAdmin = false) => {
      try {
        if (!motivoCancelacion || motivoCancelacion.trim() === '') {
          throw new Error('Debes proporcionar un motivo para la cancelación');
        }

        const ausenciaRef = doc(db, 'AUSENCIAS', ausencia.id);
        const motivo = esAdmin 
          ? ('Admin: ' + motivoCancelacion.trim()) 
          : motivoCancelacion.trim();

        await updateDoc(ausenciaRef, {
          estado: 'cancelado',
          fechaCancelacion: formatYMD(new Date()),
          motivoCancelacion: motivo,
          updatedAt: new Date()
        });

        // Notificaciones según quién canceló
        try {
          const { sendNotification, userProfile } = useAuthStore.getState();
          const { formatearNombre } = await import('../components/Helpers');
          const nombreSolicitante = formatearNombre(userProfile?.nombre || ausencia.solicitante);

          if (esAdmin && ausencia.solicitante !== useAuthStore.getState().user?.email) {
            // Admin cancela → notificar al empleado
            await sendNotification({
              empleadoEmail: ausencia.solicitante,
              title: `⚠️ ${ausencia.tipo === 'baja' ? 'Baja cancelada' : 'Permiso cancelado'}`,
              body: `Tu ${ausencia.tipo === 'baja' ? 'Baja ha sido cancelada' : 'Permiso ha sido cancelado'} por administración.\n\n💬 Motivo: ${motivoCancelacion}`,
              url: '/ausencias/MisAusencias',
              type: 'ausencia_cancelada_admin'
            });
          } else if (!esAdmin) {
            // Trabajador cancela → notificar a admins
            await fetch('/.netlify/functions/notifyAdmins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                solicitante: ausencia.solicitante,
                nombreSolicitante: nombreSolicitante,
                tipo: ausencia.tipo,
                motivo: ausencia.motivo,
                accion: 'cancelacion_ausencia',
                mensaje: `${nombreSolicitante} ha cancelado su ${ausencia.tipo}.\n\n💬 Motivo: ${motivoCancelacion}`
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

    // Eliminar ausencia (solo pendientes)
    eliminarAusencia: async (ausenciaId, ausencia) => {
      try {
        if (ausencia.estado !== 'pendiente') {
          throw new Error('Solo se pueden eliminar ausencias pendientes');
        }

        const ausenciaRef = doc(db, 'AUSENCIAS', ausenciaId);
        await updateDoc(ausenciaRef, {
          estado: 'eliminado',
          fechaEliminacion: formatYMD(new Date()),
          updatedAt: new Date()
        });

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
