// stores/vacacionesStore.js
import { create } from 'zustand';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, query, where, orderBy, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthStore } from './authStore';
import { formatYMD, esFinDeSemana, esFechaPasadaOHoy, formatearFechaCorta } from '../utils/dateUtils';
import { formatearNombre } from '../components/Helpers';

export const useVacacionesStore = create((set, get) => {
  
  let unsubscribeSolicitudes = null;
  let unsubscribeFestivos = null;
  let unsubscribeConfig = null;

  return {
    // Estado principal
    añoFestivosActual: new Date().getFullYear(),
    solicitudesVacaciones: [],
    festivos: [],
    loading: false,
    error: null,
    configVacaciones: null,

    loadConfigVacaciones: () => {
      try {
        if (unsubscribeConfig) { unsubscribeConfig(); unsubscribeConfig = null; }
        const ref = doc(db, 'CONFIG', 'VACACIONES_CONFIG');
        unsubscribeConfig = onSnapshot(ref, (snap) => {
          set({ configVacaciones: snap.exists() ? snap.data() : null });
        }, (error) => {
          console.error('Error cargando config:', error);
          set({ configVacaciones: null });
        });
        return () => { if (unsubscribeConfig) { unsubscribeConfig(); unsubscribeConfig = null; } };
      } catch (e) {
        console.error('Error init config:', e);
        set({ configVacaciones: null });
        return () => {};
      }
    },

    updateConfigVacaciones: async (nuevo) => {
      try {
        const ref = doc(db, 'CONFIG', 'VACACIONES_CONFIG');
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

    loadSolicitudesConCancelaciones: async (userEmail) => {
      try {
        const { isAuthenticated, user, isAdminOrOwner } = useAuthStore.getState();
        if (!isAuthenticated || !user) {
          return [];
        }

        let solicitudesQuery;
        if (isAdminOrOwner()) {
          solicitudesQuery = query(
            collection(db, 'VACACIONES'),
            orderBy('fechaSolicitud', 'desc')
          );
        } else {
          solicitudesQuery = query(
            collection(db, 'VACACIONES'),
            where('solicitante', '==', userEmail),
            orderBy('fechaSolicitud', 'desc')
          );
        }

        const snapshot = await getDocs(solicitudesQuery);
        const solicitudes = [];

        // ✅ OBTENER cancelaciones parciales para cada solicitud
        for (const docSnap of snapshot.docs) {
          const solicitudData = { id: docSnap.id, ...docSnap.data() };
          const cancelacionesParciales = await get().obtenerCancelacionesParciales(docSnap.id);
          
          solicitudes.push({
            ...solicitudData,
            cancelacionesParciales
          });
        }

        return solicitudes;
      } catch (error) {
        console.error('Error cargando solicitudes con cancelaciones:', error);
        return [];
      }
    },

    // Obtener días cancelados totales de todas las subcolecciones
    obtenerDiasCancelados: (cancelacionesParciales) => {
      if (!Array.isArray(cancelacionesParciales)) return [];
      
      return cancelacionesParciales.reduce((acc, cancelacion) => {
        return [...acc, ...cancelacion.fechasCanceladas];
      }, []);
    },

    // Obtener días disfrutados (pasados y no cancelados)
    obtenerDiasDisfrutados: (solicitud) => {
      if (!solicitud.fechas) return [];
      
      const diasCancelados = get().obtenerDiasCancelados(solicitud.cancelacionesParciales || []);
      
      return solicitud.fechas.filter(fecha => {
        const esFechaPasada = esFechaPasadaOHoy(fecha);
        const yaFueCancelado = diasCancelados.includes(fecha);
        return esFechaPasada && !yaFueCancelado;
      });
    },

    // Verificar si puede cancelarse parcialmente
    puedeCancelarParcialmente: (solicitud, esAdmin = false) => {
      if (solicitud.estado !== 'aprobada') return false;
      
      // ✅ NO permitir para horas sueltas
      const esHorasSueltas = solicitud.horasSolicitadas < 8 && solicitud.fechas.length === 1;
      if (esHorasSueltas) return false;
      
      const diasCancelados = get().obtenerDiasCancelados(solicitud.cancelacionesParciales || []);
      
      const diasDisponibles = solicitud.fechas.filter(fecha => {
        const yaFueCancelado = diasCancelados.includes(fecha);
        const esFechaPasada = esFechaPasadaOHoy(fecha);
        
        // ✅ Admin puede cancelar días pasados, usuario no
        return !yaFueCancelado && (esAdmin || !esFechaPasada);
      });
      
      return diasDisponibles.length > 1; // Debe quedar al menos 1 día
    },

    // Cargar solicitudes de vacaciones
    loadSolicitudesVacaciones: (userEmail) => {
      const { isAuthenticated, user, isAdminOrOwner } = useAuthStore.getState();
      
      if (!isAuthenticated || !user) {
        set({ solicitudesVacaciones: [], error: "Sin permisos para acceder a solicitudes" });
        return () => {};
      }

      if (unsubscribeSolicitudes) {
        unsubscribeSolicitudes();
        unsubscribeSolicitudes = null;
      }

      set({ loading: true });

      let solicitudesQuery;
      
      if (isAdminOrOwner()) {
        solicitudesQuery = query(
          collection(db, 'VACACIONES'),
          orderBy('fechaSolicitud', 'desc')
        );
      } else {
        solicitudesQuery = query(
          collection(db, 'VACACIONES'),
          where('solicitante', '==', userEmail),
          orderBy('fechaSolicitud', 'desc')
        );
      }

      unsubscribeSolicitudes = onSnapshot(
        solicitudesQuery,
        (snapshot) => {
          const solicitudes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          set({
            solicitudesVacaciones: solicitudes,
            loading: false,
            error: null
          });
        },
        (error) => {
          console.error('Error en listener solicitudes:', error);
          set({ error: error.message, loading: false });
        }
      );

      return () => {
        if (unsubscribeSolicitudes) {
          unsubscribeSolicitudes();
          unsubscribeSolicitudes = null;
        }
      };
    },

        loadMisSolicitudesVacaciones: (userEmail) => {
      if (!userEmail) {
        set({ solicitudesVacaciones: [], error: "Email de usuario requerido" });
        return () => {};
      }

      if (unsubscribeSolicitudes) {
        unsubscribeSolicitudes();
        unsubscribeSolicitudes = null;
      }

      set({ loading: true });

      const solicitudesQuery = query(
        collection(db, 'VACACIONES'),
        where('solicitante', '==', userEmail),
        orderBy('fechaSolicitud', 'desc')
      );

      unsubscribeSolicitudes = onSnapshot(
        solicitudesQuery,
        (snapshot) => {
          const solicitudes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          set({
            solicitudesVacaciones: solicitudes,
            loading: false,
            error: null
          });
        },
        (error) => {
          console.error('Error en listener mis solicitudes:', error);
          set({ error: error.message, loading: false });
        }
      );

      return () => {
        if (unsubscribeSolicitudes) {
          unsubscribeSolicitudes();
          unsubscribeSolicitudes = null;
        }
      };
    },

    // Cargar días festivos
    loadFestivos: () => {
      if (unsubscribeFestivos) {
        unsubscribeFestivos();
        unsubscribeFestivos = null;
      }

      unsubscribeFestivos = onSnapshot(
        collection(db, 'DIAS_FESTIVOS'),
        (snapshot) => {
      // Aplana todos los festivos de todos los documentos (años)
      const festivosFlatten = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const lista = Array.isArray(data?.festivos) ? data.festivos : [];
        for (const f of lista) {
          festivosFlatten.push(f);
        }
      });
      set({ festivos: festivosFlatten });
        },
        (error) => {
          console.error('Error cargando festivos:', error);
          set({ festivos: [] });
        }
      );

      return () => {
        if (unsubscribeFestivos) {
          unsubscribeFestivos();
          unsubscribeFestivos = null;
        }
      };
    },

    // Crear nueva solicitud
    crearSolicitudVacaciones: async (solicitudData) => {
      try {
        const { userProfile } = useAuthStore.getState();
        
        const horasDisponiblesTrasAprobacion = solicitudData.horasDisponiblesAntesSolicitud - solicitudData.horasSolicitadas;
        
        const nuevaSolicitud = {
          ...solicitudData,
          horasDisponiblesTrasAprobacion,
          fechaSolicitud: formatYMD(new Date()),
          fechaSolicitudOriginal: formatYMD(new Date()), 
          estado: 'pendiente',
          comentariosAdmin: '',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const docRef = await addDoc(collection(db, 'VACACIONES'), nuevaSolicitud);

        await updateDoc(doc(db, 'USUARIOS', solicitudData.solicitante), {
          'vacaciones.pendientes': userProfile.vacaciones.pendientes + solicitudData.horasSolicitadas
        });

        try {
          const creada = { id: docRef.id, ...nuevaSolicitud };
          await get().autoAprobarSiCorresponde(creada);
        } catch (e) {
          console.warn('Auto-aprobación no aplicada:', e?.message);
        }
        return docRef.id;
        
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    // Actualizar solicitud
    actualizarSolicitudVacaciones: async (solicitudId, datosActualizados, solicitudOriginal) => {
      try {
        const { userProfile } = useAuthStore.getState();
        
        if (!userProfile) {
          throw new Error('Datos de usuario no disponibles');
        }

        // Preparar datos de actualización con fecha actual y cambio de estado
        const datosFinales = {
          ...datosActualizados,
          fechaSolicitud: formatYMD(new Date()), // ✅ Actualizar fecha de solicitud
          updatedAt: new Date()
        };

            // Si la solicitud estaba aprobada, cambiarla a pendiente
        if (solicitudOriginal.estado === 'aprobada') {
          datosFinales.estado = 'pendiente';
          datosFinales.comentariosAdmin = ''; // Limpiar comentarios del admin
          datosFinales.fechaAprobacionDenegacion = null; // Limpiar fecha de aprobación anterior
        }
        await updateDoc(doc(db, 'VACACIONES', solicitudId), datosFinales);

        // Manejar cambios en el saldo según el estado original
        const diferencia = datosActualizados.horasSolicitadas - solicitudOriginal.horasSolicitadas;
        const userDocRef = doc(db, 'USUARIOS', solicitudOriginal.solicitante);
        
        if (solicitudOriginal.estado === 'pendiente') {
          // Si era pendiente: ajustar solo pendientes
          if (diferencia !== 0) {
            await updateDoc(userDocRef, {
              'vacaciones.pendientes': userProfile.vacaciones.pendientes + diferencia
            });
          }
        } else if (solicitudOriginal.estado === 'aprobada') {
          // Si era aprobada: devolver horas a disponibles y ajustar pendientes
          if (diferencia !== 0) {
            await updateDoc(userDocRef, {
              'vacaciones.disponibles': userProfile.vacaciones.disponibles - diferencia,
              'vacaciones.pendientes': userProfile.vacaciones.pendientes + diferencia
            });
          } else {
            // ✅ NUEVO: Aunque no cambien las horas, devolver las originales a disponibles y ponerlas como pendientes
            await updateDoc(userDocRef, {
              'vacaciones.disponibles': userProfile.vacaciones.disponibles + solicitudOriginal.horasSolicitadas,
              'vacaciones.pendientes': userProfile.vacaciones.pendientes + solicitudOriginal.horasSolicitadas
            });
          }
        }

        return true;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    obtenerSolicitudPorId: async (solicitudId) => {
      try {
        const docSnap = await getDoc(doc(db, 'VACACIONES', solicitudId));
        
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...docSnap.data()
          };
        } else {
          throw new Error('Solicitud no encontrada');
        }
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    obtenerCancelacionesParciales: async (solicitudId) => {
      try {
        const cancelacionesQuery = query(
          collection(db, 'VACACIONES', solicitudId, 'cancelaciones_parciales'),
          orderBy('fechaCancelacion', 'desc')
        );
        const snapshot = await getDocs(cancelacionesQuery);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error obteniendo cancelaciones parciales:', error);
        return [];
      }
    },

    obtenerSolicitudCompleta: async (solicitudId) => {
      try {
        const solicitudDoc = await getDoc(doc(db, 'VACACIONES', solicitudId));
        if (!solicitudDoc.exists()) {
          throw new Error('Solicitud no encontrada');
        }
        
        const cancelacionesParciales = await get().obtenerCancelacionesParciales(solicitudId);
        
        return {
          id: solicitudDoc.id,
          ...solicitudDoc.data(),
          cancelacionesParciales
        };
      } catch (error) {
        console.error('Error obteniendo solicitud completa:', error);
      }
    },


    eliminarSolicitudVacaciones: async (solicitudId, horasSolicitadas, solicitanteEmail) => {
      try {
        const { userProfile } = useAuthStore.getState();
        
        await deleteDoc(doc(db, 'VACACIONES', solicitudId));

        await updateDoc(doc(db, 'USUARIOS', solicitanteEmail), {
          'vacaciones.pendientes': userProfile.vacaciones.pendientes - horasSolicitadas
        });

        return true;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    cancelarSolicitudVacaciones: async (solicitud, motivoCancelacion) => {
  try {
    if (!motivoCancelacion || motivoCancelacion.trim() === '') {
      throw new Error('Debes proporcionar un motivo para la cancelación');
    }

    // ✅ OBTENER cancelaciones parciales previas
    const cancelacionesPrevias = await get().obtenerCancelacionesParciales(solicitud.id);
    const diasYaCancelados = cancelacionesPrevias.reduce((acc, c) => {
      return [...acc, ...c.fechasCanceladas];
    }, []);

    // ✅ CALCULAR días restantes no cancelados y no disfrutados
    const diasDisponibles = solicitud.fechas.filter(fecha => {
      const yaFueCancelado = diasYaCancelados.includes(fecha);
      const esFechaPasada = esFechaPasadaOHoy(fecha);
      return !yaFueCancelado && !esFechaPasada;
    });

    // ✅ CORREGIDO: Calcular horas correctamente
    let horasADevolver;
    if (solicitud.estado === 'pendiente') {
      // Para pendientes: devolver las horas solicitadas originalmente (menos las ya canceladas)
      const horasYaCanceladas = diasYaCancelados.length * 8;
      horasADevolver = solicitud.horasSolicitadas - horasYaCanceladas;
    } else {
      // Para aprobadas: calcular por días disponibles
      horasADevolver = diasDisponibles.length * 8;
    }

    // ✅ ACTUALIZAR estado a "cancelado"
    await updateDoc(doc(db, 'VACACIONES', solicitud.id), {
      estado: 'cancelado',
      fechaCancelacion: formatYMD(new Date()),
      motivoCancelacion: motivoCancelacion.trim(),
      updatedAt: new Date()
    });

    if (horasADevolver > 0) {
      const userDocRef = doc(db, 'USUARIOS', solicitud.solicitante);
      
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const vacacionesActuales = userData.vacaciones || { disponibles: 0, pendientes: 0 };
        
        if (solicitud.estado === 'pendiente') {
          await updateDoc(userDocRef, {
            'vacaciones.pendientes': vacacionesActuales.pendientes - horasADevolver
          });
        } else if (solicitud.estado === 'aprobada') {
          await updateDoc(userDocRef, {
            'vacaciones.disponibles': vacacionesActuales.disponibles + horasADevolver
          });
        }
      }
    }

    return true;
  } catch (error) {
    set({ error: error.message });
    throw error;
  }
},


    // Cambiar estado solicitud (admin)
    cambiarEstadoSolicitud: async (solicitudId, nuevoEstado, comentariosAdmin, solicitud) => {
      try {
        const { isAdminOrOwner } = useAuthStore.getState();
        
        if (!isAdminOrOwner()) {
          throw new Error('Sin permisos para cambiar estado de solicitudes');
        }
      // Obtener saldo actual del empleado ANTES del cambio
        const userDocRef = doc(db, 'USUARIOS', solicitud.solicitante);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        const saldoAntes = userData.vacaciones || { disponibles: 0, pendientes: 0 };

        let saldoDespues = { ...saldoAntes };

            
        if (nuevoEstado === 'aprobada') {
          saldoDespues.disponibles = saldoAntes.disponibles - solicitud.horasSolicitadas;
          saldoDespues.pendientes = saldoAntes.pendientes - solicitud.horasSolicitadas;
          
          await updateDoc(userDocRef, {
            'vacaciones.disponibles': saldoDespues.disponibles,
            'vacaciones.pendientes': saldoDespues.pendientes
          });
        } else if (nuevoEstado === 'denegada') {
          saldoDespues.pendientes = saldoAntes.pendientes - solicitud.horasSolicitadas;
          
          await updateDoc(userDocRef, {
            'vacaciones.pendientes': saldoDespues.pendientes
          });
        }

        await updateDoc(doc(db, 'VACACIONES', solicitudId), {
          estado: nuevoEstado,
          comentariosAdmin: comentariosAdmin || '',
          fechaAprobacionDenegacion: formatYMD(new Date()),
          updatedAt: new Date(),
          horasDisponiblesAntesCambio: saldoAntes.disponibles,           
          horasDisponiblesDespuesCambio: saldoDespues.disponibles,       
          horasPendientesAntesCambio: saldoAntes.pendientes,            
          horasPendientesDespuesCambio: saldoDespues.pendientes,  
        });

        return true;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    obtenerDatosUsuarios: async (emails) => {
      try {
        const usuarios = {};
        
        for (const email of emails) {
          const userDoc = await getDoc(doc(db, 'USUARIOS', email));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            usuarios[email] = {
              nombre: userData.nombre || email,
              puesto: userData.puesto || 'No definido'
            };
          } else {
            usuarios[email] = {
              nombre: email,
              puesto: 'No definido'
            };
          }
        }
        
        return usuarios;
      } catch (error) {
        console.error('Error obteniendo datos usuarios:', error);
        return {};
      }
    },

    // Utilidades con date-fns
    esFestivo: (fecha) => {
      const { festivos } = get();
      return festivos.some(festivo => festivo.fecha === fecha);
    },

    esFinDeSemana: (fecha) => esFinDeSemana(fecha),

    esFechaSeleccionable: (fecha) => {
      const { esFestivo } = get();
      return !esFechaPasadaOHoy(fecha) && !esFestivo(fecha) && !esFinDeSemana(fecha);
    },

    calcularHorasLaborables: (fechas) => {
      const { esFechaSeleccionable } = get();
      return fechas.filter(fecha => esFechaSeleccionable(fecha)).length * 8;
    },

    procesarSolicitudesCaducadas: async () => {
      try {
        const { solicitudesVacaciones } = get();
        
        const solicitudesPendientesCaducadas = solicitudesVacaciones.filter(solicitud => {
          const primeraFecha = solicitud.fechas[0];
          return solicitud.estado === 'pendiente' && esFechaPasadaOHoy(primeraFecha);
        });

        if (solicitudesPendientesCaducadas.length === 0) {
          return { procesadas: 0 };
        }

        console.log(`🔄 Procesando ${solicitudesPendientesCaducadas.length} solicitudes caducadas`);

        let procesadas = 0;
        for (const solicitud of solicitudesPendientesCaducadas) {
          try {
            // ✅ CORRECCIÓN: pasar el objeto solicitud completo y el motivo
            await get().cancelarSolicitudVacaciones(
              solicitud, 
              'Solicitud cancelada automáticamente. No pudo ser revisada antes de las fechas solicitadas.'
            );
            procesadas++;
          } catch (error) {
            console.error(`❌ Error al procesar solicitud caducada ${solicitud.id}:`, error);
          }
        }

        console.log(`✅ Procesadas ${procesadas} solicitudes caducadas`);
        return { procesadas };
        
      } catch (error) {
        console.error('❌ Error general procesando solicitudes caducadas:', error);
        return { procesadas: 0, error: error.message };
      }
    },

      crearFestivo: async (año, festivo) => {
        try {
          const docRef = doc(db, 'DIAS_FESTIVOS', año.toString());
          const docSnap = await getDoc(docRef);
          
          let festivosActuales = [];
          if (docSnap.exists()) {
            festivosActuales = docSnap.data().festivos || [];
          }
          
          // Validar que no existe ya esa fecha
          const fechaExiste = festivosActuales.some(f => f.fecha === festivo.fecha);
          if (fechaExiste) {
            throw new Error('Ya existe un festivo para esta fecha');
          }
          
          const nuevosFestivos = [...festivosActuales, festivo]
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
          
          await updateDoc(docRef, { festivos: nuevosFestivos });
          return true;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      editarFestivo: async (año, festivoAntiguo, festivoNuevo) => {
        try {
          const docRef = doc(db, 'DIAS_FESTIVOS', año.toString());
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            throw new Error('No se encontraron festivos para este año');
          }
          
          let festivosActuales = docSnap.data().festivos || [];
          
          // Si cambió la fecha, validar que no existe
          if (festivoAntiguo.fecha !== festivoNuevo.fecha) {
            const fechaExiste = festivosActuales.some(f => 
              f.fecha === festivoNuevo.fecha && f.fecha !== festivoAntiguo.fecha
            );
            if (fechaExiste) {
              throw new Error('Ya existe un festivo para esta fecha');
            }
          }
          
          // Reemplazar el festivo
          const nuevosFestivos = festivosActuales
            .map(f => 
              f.fecha === festivoAntiguo.fecha && f.nombre === festivoAntiguo.nombre 
                ? festivoNuevo 
                : f
            )
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
          
          await updateDoc(docRef, { festivos: nuevosFestivos });
          return true;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      eliminarFestivo: async (año, festivo) => {
        try {
          const docRef = doc(db, 'DIAS_FESTIVOS', año.toString());
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            throw new Error('No se encontraron festivos para este año');
          }
          
          const festivosActuales = docSnap.data().festivos || [];
          const nuevosFestivos = festivosActuales.filter(f => 
            !(f.fecha === festivo.fecha && f.nombre === festivo.nombre)
          );
          
          await updateDoc(docRef, { festivos: nuevosFestivos });
          return true;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      copiarFestivosAño: async (añoOrigen, añoDestino) => {
        try {
          const docRefOrigen = doc(db, 'DIAS_FESTIVOS', añoOrigen.toString());
          const docSnapOrigen = await getDoc(docRefOrigen);
          
          if (!docSnapOrigen.exists()) {
            throw new Error(`No hay festivos configurados para ${añoOrigen}`);
          }
          
          const festivosOrigen = docSnapOrigen.data().festivos || [];
          
          if (festivosOrigen.length === 0) {
            throw new Error(`No hay festivos para copiar del año ${añoOrigen}`);
          }
          
          // Transformar fechas al nuevo año
          const festivosDestino = festivosOrigen.map(festivo => ({
            ...festivo,
            fecha: festivo.fecha.replace(añoOrigen.toString(), añoDestino.toString())
          })).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
          
          const docRefDestino = doc(db, 'DIAS_FESTIVOS', añoDestino.toString());
          await setDoc(docRefDestino, { festivos: festivosDestino });
          
          return { copiados: festivosDestino.length };
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      obtenerAñosConFestivos: async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'DIAS_FESTIVOS'));
          const años = querySnapshot.docs.map(doc => parseInt(doc.id)).sort((a, b) => b - a);
          return años;
        } catch (error) {
          console.error('Error obteniendo años:', error);
          return [];
        }
      },

      aprobarSolicitudesMasivamente: async (solicitudesIds, comentariosAdmin = '') => {
        try {
          const { isAdminOrOwner } = useAuthStore.getState();
          
          if (!isAdminOrOwner()) {
            throw new Error('Sin permisos para aprobar solicitudes');
          }

          let procesadas = 0;
          let errores = [];

          for (const solicitudId of solicitudesIds) {
            try {
              // Obtener la solicitud para acceder a sus datos
              const solicitudDoc = await getDoc(doc(db, 'VACACIONES', solicitudId));
              
              if (solicitudDoc.exists()) {
                const solicitud = { id: solicitudDoc.id, ...solicitudDoc.data() };
                await get().cambiarEstadoSolicitud(solicitudId, 'aprobada', comentariosAdmin, solicitud);
                procesadas++;
              }
            } catch (error) {
              errores.push(`Error con solicitud ${solicitudId}: ${error.message}`);
            }
          }

          return { 
            procesadas, 
            errores, 
            exito: errores.length === 0 
          };
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // Denegación masiva de solicitudes
      denegarSolicitudesMasivamente: async (solicitudesIds, motivoDenegacion) => {
        try {
          const { isAdminOrOwner } = useAuthStore.getState();
          
          if (!isAdminOrOwner()) {
            throw new Error('Sin permisos para denegar solicitudes');
          }

          if (!motivoDenegacion || motivoDenegacion.trim() === '') {
            throw new Error('Debes proporcionar un motivo para la denegación');
          }

          let procesadas = 0;
          let errores = [];

          for (const solicitudId of solicitudesIds) {
            try {
              const solicitudDoc = await getDoc(doc(db, 'VACACIONES', solicitudId));
              
              if (solicitudDoc.exists()) {
                const solicitud = { id: solicitudDoc.id, ...solicitudDoc.data() };
                await get().cambiarEstadoSolicitud(solicitudId, 'denegada', motivoDenegacion, solicitud);
                procesadas++;
              }
            } catch (error) {
              errores.push(`Error con solicitud ${solicitudId}: ${error.message}`);
            }
          }

          return { 
            procesadas, 
            errores, 
            exito: errores.length === 0 
          };
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      //  Obtener empleados únicos de solicitudes
      obtenerEmpleadosConSolicitudes: () => {
        const { solicitudesVacaciones } = get();
        const empleados = [...new Set(solicitudesVacaciones.map(s => s.solicitante))];
        return empleados.sort();
      },

      obtenerPuestosConSolicitudes: () => {
        // Por ahora devolvemos lista estática, luego se puede conectar con datos reales
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
    
    calcularDisponibilidadPorFecha: async (fecha, puesto = null) => {
      try {
        // ✅ OPTIMIZACIÓN: Obtener solicitudes aprobadas directamente desde Firestore
        // En lugar de usar solicitudesVacaciones que puede estar vacío
        const añoFecha = new Date(fecha).getFullYear();
        const solicitudesAprobadas = await get().loadVacacionesAprobadas(añoFecha);
        
        // ✅ VALIDACIÓN: Asegurar que tenemos solicitudes válidas
        if (!Array.isArray(solicitudesAprobadas) || solicitudesAprobadas.length === 0) {
          return { 
            enVacaciones: [], 
            porPuesto: {},
            totalEnVacaciones: 0
          };
        }
        
        // Filtrar solo las solicitudes que incluyen la fecha específica
        const solicitudesEnFecha = solicitudesAprobadas.filter(s => 
          Array.isArray(s.fechas) && s.fechas.includes(fecha)
        );
        
        if (solicitudesEnFecha.length === 0) {
          return { 
            enVacaciones: [], 
            porPuesto: {},
            totalEnVacaciones: 0
          };
        }
        
        const emailsEmpleados = solicitudesEnFecha.map(s => s.solicitante);
        const datosUsuarios = await get().obtenerDatosUsuarios(emailsEmpleados);
        
        // Agrupar por puesto usando los datos obtenidos eficientemente
        const porPuesto = {};
        
        for (const solicitud of solicitudesEnFecha) {
          const userData = datosUsuarios[solicitud.solicitante] || {};
          const puestoUsuario = userData.puesto || 'Sin definir';
          
          // ✅ FILTRO OPCIONAL: Si se especifica un puesto, solo incluir ese puesto
          if (puesto && puestoUsuario !== puesto) {
            continue;
          }
          
          if (!Array.isArray(porPuesto[puestoUsuario])) {
            porPuesto[puestoUsuario] = [];
          }
          
          porPuesto[puestoUsuario].push({
            email: solicitud.solicitante,
            nombre: userData.nombre || solicitud.solicitante
          });
        }
        
        return {
          enVacaciones: solicitudesEnFecha.map(s => s.solicitante),
          porPuesto: porPuesto || {},
          totalEnVacaciones: solicitudesEnFecha.length
        };
      } catch (error) {
        console.error('Error calculando disponibilidad:', error);
        return { 
          enVacaciones: [], 
          porPuesto: {},
          totalEnVacaciones: 0
        };
      }
    },


    // Detectar conflictos de cobertura
    detectarConflictos: async (fecha, umbralMinimo = {}) => {
      try {
        const { configVacaciones } = get();
        const umbralesConfig = (configVacaciones?.cobertura?.umbrales) || null;
        const disponibilidad = await get().calcularDisponibilidadPorFecha(fecha);

      if (!disponibilidad || !disponibilidad.porPuesto || typeof disponibilidad.porPuesto !== 'object') {
      return [];
    }
        const conflictos = []
        
        const umbralesBase = {
          'Fresador': 4, 'Tornero': 3, 'Operario CNC': 3,
          'Montador': 2, 'Administrativo': 2, 'Diseñador': 2, 'Ayudante de Taller': 2
        };
      const umbrales = umbralesConfig ? umbralesConfig : umbralesBase;;
        
        
        // ✅ VALIDACIÓN: Solo iterar si porPuesto es un objeto válido
            const porPuesto = disponibilidad.porPuesto || {};
            const entries = Object.entries(porPuesto);
            
            for (const [puesto, empleadosEnVacaciones] of entries) {
              // ✅ VALIDACIÓN: Asegurar que empleadosEnVacaciones es un array
              if (!Array.isArray(empleadosEnVacaciones)) {
                continue;
              }
              
              const umbral = umbrales[puesto] || 1;
              const enVacaciones = empleadosEnVacaciones.length;
              
              if (enVacaciones >= umbral) {
                conflictos.push({
                  puesto,
                  enVacaciones,
                  umbral,
                  empleados: empleadosEnVacaciones,
                  severidad: enVacaciones >= umbral * 1.5 ? 'alta' : 'media'
                });
              }
            }
            
            return conflictos;
          } catch (error) {
            console.error('Error detectando conflictos:', error);
            return [];
          }
        },

        evaluarAutoAprobacion: async (solicitud) => {
          const { configVacaciones, detectarConflictos } = get();

          if (!configVacaciones?.autoAprobar?.habilitado) return { aplicar: false, motivo: 'flag off' };

          const modo = configVacaciones.autoAprobar.modo || 'todas';
          const maxHoras = parseInt(configVacaciones.autoAprobar.maxHoras || 0, 10);

          const cumpleHoras = (modo === 'porHoras' || modo === 'porHorasYsinConflictos')
            ? (solicitud.horasSolicitadas || 0) <= maxHoras
            : true;

          const cumpleConflictos = (modo === 'sinConflictos' || modo === 'porHorasYsinConflictos')
            ? await (async () => {
                // Si alguna fecha tiene conflictos, no cumple
                const conflictosPorDia = await Promise.all(
                  (solicitud.fechas || []).map(f => get().detectarConflictos(f))
                );
                return conflictosPorDia.every(arr => !arr || arr.length === 0);
              })()
            : true;

          const aplicar = (modo === 'todas') ? true : (cumpleHoras && cumpleConflictos);

          return { aplicar, motivo: aplicar ? 'ok' : 'reglas no cumplidas' };
        },

        autoAprobarSiCorresponde: async (solicitud) => {
          const { evaluarAutoAprobacion, cambiarEstadoSolicitud, configVacaciones } = get();
          const res = await evaluarAutoAprobacion(solicitud);
          if (!res.aplicar) return { aplicado: false, motivo: res.motivo };

          const mensaje = (configVacaciones?.autoAprobar?.mensaje || 'Aprobado automáticamente por política activa.');
          await cambiarEstadoSolicitud(solicitud.id, 'aprobada', mensaje, solicitud);

          return { aplicado: true };
        },


    // Cargar directamente solicitudes aprobadas desde Firestore
    loadVacacionesAprobadas: async (año = new Date().getFullYear()) => {
      try {
        const { isAdminOrOwner } = useAuthStore.getState();
        
        if (!isAdminOrOwner) {
          console.log('Sin permisos de administración para acceder a solicitudes aprobadas');
          return [];
        }
        
        // Query directo a Firestore para solicitudes aprobadas
        const vacacionesQuery = query(
          collection(db, 'VACACIONES'),
          where('estado', '==', 'aprobada'),
          orderBy('fechaSolicitud', 'desc')
        );
        
        const querySnapshot = await getDocs(vacacionesQuery);
        const solicitudesAprobadas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filtrar por año si se especifica
        const solicitudesFiltradas = solicitudesAprobadas.filter(solicitud => {
          return solicitud.fechas.some(fecha => {
            const fechaAño = new Date(fecha).getFullYear();
            return fechaAño === año;
          });
        });
        
        return solicitudesFiltradas.sort((a, b) => new Date(a.fechas[0]) - new Date(b.fechas[0]));
        
      } catch (error) {
        console.error('Error cargando vacaciones aprobadas:', error);
        set({ error: error.message });
        return [];
      }
    },

    // Cargar historial completo con filtros
    loadHistorialSolicitudes: async (filtros = {}) => {
      try {
        const { isAdminOrOwner } = useAuthStore.getState();
        
        if (!isAdminOrOwner()) {
          console.log('Sin permisos para acceder al historial completo');
          return [];
        }
        
        // Query base para todas las solicitudes
        let solicitudesQuery = query(
          collection(db, 'VACACIONES'),
          orderBy('fechaSolicitud', 'desc')
        );
        
        // Aplicar filtros si se especifican
        if (filtros.estado && filtros.estado !== 'todos') {
          solicitudesQuery = query(
            collection(db, 'VACACIONES'),
            where('estado', '==', filtros.estado),
            orderBy('fechaSolicitud', 'desc')
          );
        }
        
        const querySnapshot = await getDocs(solicitudesQuery);
        let solicitudes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filtros adicionales en memoria (más flexibles)
        if (filtros.empleado) {
          solicitudes = solicitudes.filter(s => s.solicitante === filtros.empleado);
        }
        
        if (filtros.año) {
          solicitudes = solicitudes.filter(s => {
            const añoSolicitud = new Date(s.fechaSolicitud).getFullYear();
            const añoPrimeraFecha = s.fechas && s.fechas.length > 0 ? 
              new Date(s.fechas[0]).getFullYear() : añoSolicitud;
            return añoSolicitud === filtros.año || añoPrimeraFecha === filtros.año;
          });
        }

        return solicitudes;
      } catch (error) {
        console.error('Error cargando historial:', error);
        set({ error: error.message });
        return [];
      }
    },

    //  Exportar historial a CSV
    exportarHistorialCSV: async (solicitudes, datosUsuarios) => {
      try {
        const headers = [
          'Empleado',
          'Puesto', 
          'Estado',
          'Fecha Solicitud',
          'Fechas Vacaciones',
          'Horas Solicitadas',
          'Días',
          'Comentarios Empleado',
          'Comentarios Admin',
          'Fecha Resolución',
          'Motivo Cancelación'
        ];
        
        const rows = solicitudes.map(s => {
          const userData = datosUsuarios[s.solicitante] || {};
          const fechasFormatted = s.fechas ? s.fechas.join(', ') : '';
          const fechaResolucion = s.fechaAprobacionDenegacion || s.fechaCancelacion || '';
          
          return [
            userData.nombre || s.solicitante,
            userData.puesto || '',
            s.estado,
            s.fechaSolicitud,
            fechasFormatted,
            s.horasSolicitadas || 0,
            s.horasSolicitadas ? Math.round(s.horasSolicitadas / 8) : 0,
            s.comentariosSolicitante || '',
            s.comentariosAdmin || '',
            fechaResolucion,
            s.motivoCancelacion || ''
          ];
        });
        
        const csvContent = [headers, ...rows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `historial_vacaciones_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
      } catch (error) {
        console.error('Error exportando CSV:', error);
        throw error;
      }
    },


  cancelarSolicitudParcial: async (solicitud, diasACancelar, motivoCancelacion, esAdmin = false) => {
    try {
      const { user } = useAuthStore.getState();
      
      if (!motivoCancelacion || motivoCancelacion.trim() === '') {
        throw new Error('Debes proporcionar un motivo para la cancelación parcial');
      }

      if (!Array.isArray(diasACancelar) || diasACancelar.length === 0) {
        throw new Error('Debes seleccionar al menos un día para cancelar');
      }

      // ✅ VALIDACIÓN: Solo para solicitudes de días completos
      const esHorasSueltas = solicitud.horasSolicitadas < 8 && solicitud.fechas.length === 1;
      if (esHorasSueltas) {
        throw new Error('No se pueden cancelar parcialmente solicitudes de horas sueltas');
      }

      // ✅ OBTENER cancelaciones previas para validar
      const cancelacionesPrevias = await get().obtenerCancelacionesParciales(solicitud.id);
      const diasYaCancelados = cancelacionesPrevias.reduce((acc, c) => {
        return [...acc, ...c.fechasCanceladas];
      }, []);

      // ✅ VALIDACIÓN: No cancelar días ya cancelados
      const diasDuplicados = diasACancelar.filter(dia => diasYaCancelados.includes(dia));
      if (diasDuplicados.length > 0) {
        throw new Error(`Los siguientes días ya fueron cancelados: ${diasDuplicados.join(', ')}`);
      }

      // ✅ VALIDACIÓN: No cancelar todos los días (debe quedar al menos 1)
      const diasTotalesDisponibles = solicitud.fechas.filter(f => !diasYaCancelados.includes(f));
      if (diasACancelar.length >= diasTotalesDisponibles.length) {
        throw new Error('No puedes cancelar todos los días restantes. Para eso usa cancelación completa');
      }

      // ✅ VALIDACIÓN: Solo admin puede cancelar días pasados
      if (!esAdmin) {
        const diasPasados = diasACancelar.filter(fecha => esFechaPasadaOHoy(fecha));
        if (diasPasados.length > 0) {
          throw new Error('No puedes cancelar días que ya han pasado');
        }
      }

      const horasADevolver = diasACancelar.length * 8;
      //  Obtener saldo actual del empleado ANTES de la cancelación
      const empleadoActual = esAdmin ? solicitud.solicitante : user?.email;
      const userDocRef = doc(db, 'USUARIOS', empleadoActual);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('Empleado no encontrado');
      }

      const userData = userDoc.data();
      const saldoAntes = userData.vacaciones?.disponibles || 0;
      const saldoDespues = saldoAntes + horasADevolver;

      // ✅ CREAR subcolección de cancelación parcial
      const cancelacionData = {
        fechasCanceladas: diasACancelar.sort(),
        horasDevueltas: horasADevolver,
        motivoCancelacion: motivoCancelacion.trim(),
        fechaCancelacion: formatYMD(new Date()),
        horasDisponiblesAntesCancelacion: saldoAntes,         
        horasDisponiblesDespuesCancelacion: saldoDespues,
        procesadaPor: user?.email,
        esAdmin: esAdmin,
        createdAt: new Date()
      };

      const cancelacionRef = await addDoc(
        collection(db, 'VACACIONES', solicitud.id, 'cancelaciones_parciales'),
        cancelacionData
      );
        
      // ✅ ACTUALIZAR saldo del empleado
      await updateDoc(userDocRef, {
        'vacaciones.disponibles': saldoDespues,
        updatedAt: new Date()
      });

      return {
        exito: true,
        cancelacionId: cancelacionRef.id,
        horasDevueltas: horasADevolver,
        diasCancelados: diasACancelar.length,
        saldoAntes,                                           
        saldoDespues 
      };

    } catch (error) {
      console.error('Error en cancelación parcial:', error);
      set({ error: error.message });
      throw error;
    }
  },

  // Obtener todos los empleados con sus saldos actuales
  obtenerEmpleadosConSaldos: async () => {
    try {
      const { isAdminOrOwner } = useAuthStore.getState();
      
      if (!isAdminOrOwner()) {
        throw new Error('Sin permisos para acceder a los saldos');
      }

      const usuariosQuery = query(collection(db, 'USUARIOS'));
      const querySnapshot = await getDocs(usuariosQuery);
      
      const empleados = querySnapshot.docs.map(doc => ({
        email: doc.id,
        ...doc.data(),
        saldoActual: doc.data().vacaciones || {
          disponibles: 0,
          pendientes: 0
        }
      }));

      return empleados.filter(empleado=>empleado.rol!="owner").sort((a, b) => (a.nombre || a.email).localeCompare(b.nombre || b.email));
    } catch (error) {
      console.error('Error obteniendo empleados con saldos:', error);
      throw error;
    }
  },

  // Ajustar saldo individual
  ajustarSaldoIndividual: async (empleadoEmail, tipoAjuste, horas, razonAjuste) => {
    try {
      const { user, userProfile } = useAuthStore.getState();
      
      if (!razonAjuste || razonAjuste.trim() === '') {
        throw new Error('Debes especificar una razón para el ajuste');
      }

      // Obtener datos actuales del empleado
      const userDocRef = doc(db, 'USUARIOS', empleadoEmail);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('Empleado no encontrado');
      }

      const datosEmpleado = userDoc.data();
      const saldoActual = datosEmpleado.vacaciones || { disponibles: 0, pendientes: 0 };
      
      // Calcular nuevo saldo
      let nuevoSaldo = { ...saldoActual };
      
      switch (tipoAjuste) {
        case 'añadir':
          nuevoSaldo.disponibles += horas;
          break;
        case 'reducir':
          if (saldoActual.disponibles < horas) {
            throw new Error(`No se pueden reducir ${horas}h. Saldo disponible: ${saldoActual.disponibles}h`);
          }
          nuevoSaldo.disponibles -= horas;
          break;
        case 'establecer':

          nuevoSaldo.disponibles = horas
          break;
        default:
          throw new Error('Tipo de ajuste no válido');
      }

      // Validar que el nuevo saldo no sea negativo
      if (nuevoSaldo.disponibles < 0 ) {
        throw new Error('El ajuste resultaría en un saldo negativo');
      }

      // 1. Actualizar saldo del empleado
      await updateDoc(userDocRef, {
        'vacaciones': nuevoSaldo,
        updatedAt: new Date()
      });

      // 2. Crear solicitud auto-aprobada para trazabilidad
      const solicitudAjuste = {
        solicitante: empleadoEmail,
        fechas: [], // Sin fechas específicas
        horasSolicitadas: Math.abs(horas),
        horasDisponiblesAntesSolicitud: saldoActual.disponibles,
        horasDisponiblesTrasAprobacion: nuevoSaldo.disponibles,
        fechaSolicitud: formatYMD(new Date()),
        fechaSolicitudOriginal: formatYMD(new Date()),
        estado: 'aprobada',
        fechaAprobacionDenegacion: formatYMD(new Date()),
        tipoSolicitud: 'ajuste_saldo',
        tipoAjuste: tipoAjuste,
        comentariosSolicitante: `Ajuste de saldo realizado por ${userProfile?.nombre || user?.email}`,
        comentariosAdmin: `AJUSTE DE SALDO: ${tipoAjuste.toUpperCase()} ${horas}h. Razón: ${razonAjuste.trim()}`,
        motivoAjuste: razonAjuste.trim(),
        realizadoPor: user?.email,
        esAjusteSaldo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'VACACIONES'), solicitudAjuste);

      return {
        exito: true,
        saldoAnterior: saldoActual,
        saldoNuevo: nuevoSaldo,
        horasAjustadas: horas,
        tipoAjuste: tipoAjuste
      };

    } catch (error) {
      console.error('Error en ajuste individual:', error);
      set({ error: error.message });
      throw error;
    }
  },

  // Ajustar saldos masivamente
  ajustarSaldosMasivo: async (empleadosSeleccionados, tipoAjuste, horas, razonAjuste) => {
    try {
      const { user, userProfile } = useAuthStore.getState();
      
      if (!razonAjuste || razonAjuste.trim() === '') {
        throw new Error('Debes especificar una razón para el ajuste masivo');
      }

      if (!empleadosSeleccionados || empleadosSeleccionados.length === 0) {
        throw new Error('Debes seleccionar al menos un empleado');
      }

      let procesados = 0;
      let errores = [];
      const resultados = [];

      for (const empleadoEmail of empleadosSeleccionados) {
        try {
          const resultado = await get().ajustarSaldoIndividual(
            empleadoEmail, 
            tipoAjuste, 
            horas, 
            `AJUSTE MASIVO: ${razonAjuste.trim()}`
          );
          
          resultados.push({
            empleado: empleadoEmail,
            exito: true,
            ...resultado
          });
          procesados++;
        } catch (error) {
          errores.push({
            empleado: empleadoEmail,
            error: error.message
          });
        }
      }

      return {
        procesados,
        errores,
        total: empleadosSeleccionados.length,
        exito: errores.length === 0,
        resultados
      };

    } catch (error) {
      console.error('Error en ajuste masivo:', error);
      set({ error: error.message });
      throw error;
    }
  },

  // Obtener historial de ajustes de saldo
  obtenerHistorialAjustes: async (empleadoEmail = null) => {
    try {
      let historialQuery;
      
      if (empleadoEmail) {
        // Historial de un empleado específico
        historialQuery = query(
          collection(db, 'VACACIONES'),
          where('solicitante', '==', empleadoEmail),
          where('esAjusteSaldo', '==', true),
          orderBy('fechaSolicitud', 'desc')
        );
      } else {
        // Historial completo de ajustes
        historialQuery = query(
          collection(db, 'VACACIONES'),
          where('esAjusteSaldo', '==', true),
          orderBy('fechaSolicitud', 'desc')
        );
      }

      const querySnapshot = await getDocs(historialQuery);
      const ajustes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const emails = [...new Set(ajustes.map(a => a.solicitante))];

      // 2) resolver datos de usuario (nombre, puesto, etc.)
      // Usa la util existente en la store
      const datosUsuarios = await get().obtenerDatosUsuarios(emails);

      // 3) devolver ajustes enriquecidos con 'solicitanteNombre'
      const ajustesConNombre = ajustes.map(a => ({
        ...a,
        solicitanteNombre: (datosUsuarios[a.solicitante]?.nombre || a.solicitante),
        realizadoPorNombre: (datosUsuarios[a.realizadoPor]?.nombre || a.realizadoPor)
      }));

      return ajustesConNombre;

    } catch (error) {
      console.error('Error obteniendo historial de ajustes:', error);
      throw error;
    }
  },

  // Obtener datos analíticos generales
  obtenerDatosAnaliticos: async (año = new Date().getFullYear()) => {
    try {
      const { isAdminOrOwner } = useAuthStore.getState();
      
      if (!isAdminOrOwner()) {
        throw new Error('Sin permisos para acceder a analíticas');
      }

      // Obtener todas las solicitudes del año
      const solicitudesQuery = query(
        collection(db, 'VACACIONES'),
        orderBy('fechaSolicitud', 'desc')
      );
      
      const querySnapshot = await getDocs(solicitudesQuery);
      const todasSolicitudes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrar por año
      const solicitudesAño = todasSolicitudes.filter(s => {
        const fechaSolicitud = new Date(s.fechaSolicitud);
        return fechaSolicitud.getFullYear() === año;
      });

      // Obtener datos de empleados
      const emails = [...new Set(solicitudesAño.map(s => s.solicitante))];
      const datosUsuarios = await get().obtenerDatosUsuarios(emails);

      return {
        solicitudes: solicitudesAño,
        usuarios: datosUsuarios
      };
    } catch (error) {
      console.error('Error obteniendo datos analíticos:', error);
      throw error;
    }
  },

  // Calcular distribución mensual de vacaciones
  calcularDistribucionMensual: async (año) => {
    try {
      const { solicitudes } = await get().obtenerDatosAnaliticos(año);
      const solicitudesAprobadas = solicitudes.filter(s => s.estado === 'aprobada');

      const distribucionMensual = Array.from({ length: 12 }, (_, index) => ({
        mes: new Date(2000, index).toLocaleDateString('es-ES', { month: 'short' }),
        mesNumero: index + 1,
        solicitudes: 0,
        diasTotales: 0,
        horasTotales: 0
      }));

      solicitudesAprobadas.forEach(solicitud => {
        if (solicitud.fechas && solicitud.fechas.length > 0) {
          solicitud.fechas.forEach(fecha => {
            const fechaObj = new Date(fecha);
            if (fechaObj.getFullYear() === año) {
              const mes = fechaObj.getMonth();
              distribucionMensual[mes].diasTotales++;
              distribucionMensual[mes].horasTotales += 8; // 8 horas por día
            }
          });
        }
      });

      // Contar solicitudes únicas por mes
      solicitudesAprobadas.forEach(solicitud => {
        const fechaSolicitud = new Date(solicitud.fechaSolicitud);
        if (fechaSolicitud.getFullYear() === año) {
          const mes = fechaSolicitud.getMonth();
          distribucionMensual[mes].solicitudes++;
        }
      });

      return distribucionMensual;
    } catch (error) {
      console.error('Error calculando distribución mensual:', error);
      throw error;
    }
  },

  // Calcular KPIs de aprobación
  calcularKPIsAprobacion: async (año) => {
    try {
      const { solicitudes } = await get().obtenerDatosAnaliticos(año);

      const stats = {
        total: solicitudes.length,
        aprobadas: 0,
        denegadas: 0,
        canceladas: 0,
        pendientes: 0,
        tasaAprobacion: 0,
        tiempoMedioAprobacion: 0
      };

      let tiemposAprobacion = [];

      solicitudes.forEach(s => {
        if (s.estado === 'aprobada') stats.aprobadas++;
        else if (s.estado === 'denegada') stats.denegadas++;
        else if (s.estado === 'cancelado') stats.canceladas++;
        else if (s.estado === 'pendiente') stats.pendientes++;

        // Calcular tiempo de aprobación/denegación
        if (s.fechaAprobacionDenegacion) {
          const fechaSolicitud = new Date(s.fechaSolicitud);
          const fechaResolucion = new Date(s.fechaAprobacionDenegacion);
          const diasTranscurridos = Math.floor((fechaResolucion - fechaSolicitud) / (1000 * 60 * 60 * 24));
          tiemposAprobacion.push(diasTranscurridos);
        }
      });

      const solicitudesResueltas = stats.aprobadas + stats.denegadas;
      stats.tasaAprobacion = solicitudesResueltas > 0 ? 
        Math.round((stats.aprobadas / solicitudesResueltas) * 100) : 0;

      stats.tiempoMedioAprobacion = tiemposAprobacion.length > 0 ?
        Math.round(tiemposAprobacion.reduce((a, b) => a + b, 0) / tiemposAprobacion.length) : 0;

      return stats;
    } catch (error) {
      console.error('Error calculando KPIs de aprobación:', error);
      throw error;
    }
  },

  // Calcular uso de vacaciones por empleado
  calcularUsoPorEmpleado: async (año) => {
    try {
      const { solicitudes, usuarios } = await get().obtenerDatosAnaliticos(año);
      const solicitudesAprobadas = solicitudes.filter(s => s.estado === 'aprobada');

      // Obtener saldos actuales
      const empleadosConSaldos = await get().obtenerEmpleadosConSaldos();
      const saldosMap = {};
      empleadosConSaldos.forEach(emp => {
        saldosMap[emp.email] = emp.saldoActual;
      });

      const usoEmpleados = {};

      solicitudesAprobadas.forEach(solicitud => {
        const email = solicitud.solicitante;
        const usuario = usuarios[email] || {};
        
        if (!usoEmpleados[email]) {
          const saldo = saldosMap[email] || { asignadas: 0, disponibles: 0 };
          usoEmpleados[email] = {
            email,
            nombre: formatearNombre(usuario.nombre) || email,
            puesto: usuario.puesto || 'Sin definir',
            horasUsadas: 0,
            horasAsignadas: saldo.asignadas || 0,
            solicitudes: 0,
            porcentajeUso: 0
          };
        }

        usoEmpleados[email].horasUsadas += solicitud.horasSolicitadas || 0;
        usoEmpleados[email].solicitudes++;
      });

      // Calcular porcentajes
      Object.values(usoEmpleados).forEach(emp => {
        if (emp.horasAsignadas > 0) {
          emp.porcentajeUso = Math.round((emp.horasUsadas / emp.horasAsignadas) * 100);
        }
      });

      return Object.values(usoEmpleados)
        .sort((a, b) => b.horasUsadas - a.horasUsadas);
    } catch (error) {
      console.error('Error calculando uso por empleado:', error);
      throw error;
    }
  },

  // Calcular distribución por puestos
  calcularDistribucionPorPuestos: async (año) => {
    try {
      const { solicitudes, usuarios } = await get().obtenerDatosAnaliticos(año);
      const solicitudesAprobadas = solicitudes.filter(s => s.estado === 'aprobada');

      const distribucionPuestos = {};

      solicitudesAprobadas.forEach(solicitud => {
        const usuario = usuarios[solicitud.solicitante] || {};
        const puesto = usuario.puesto || 'Sin definir';

        if (!distribucionPuestos[puesto]) {
          distribucionPuestos[puesto] = {
            puesto,
            solicitudes: 0,
            horasTotales: 0,
            empleadosUnicos: new Set()
          };
        }

        distribucionPuestos[puesto].solicitudes++;
        distribucionPuestos[puesto].horasTotales += solicitud.horasSolicitadas || 0;
        distribucionPuestos[puesto].empleadosUnicos.add(solicitud.solicitante);
      });

      return Object.values(distribucionPuestos).map(d => ({
        ...d,
        empleadosUnicos: d.empleadosUnicos.size,
        promedioPorEmpleado: d.empleadosUnicos.size > 0 ? 
          Math.round(d.horasTotales / d.empleadosUnicos.size) : 0
      })).sort((a, b) => b.horasTotales - a.horasTotales);
    } catch (error) {
      console.error('Error calculando distribución por puestos:', error);
      throw error;
    }
  },

    // Cleanup
    cleanup: () => {
      if (unsubscribeSolicitudes) {
        unsubscribeSolicitudes();
        unsubscribeSolicitudes = null;
      }
      if (unsubscribeFestivos) {
        unsubscribeFestivos();
        unsubscribeFestivos = null;
      }
      
      set({
        solicitudesVacaciones: [],
        festivos: [],
        loading: false,
        error: null
      });
    }
  };
});
