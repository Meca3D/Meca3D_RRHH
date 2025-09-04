// stores/vacacionesStore.js
import { create } from 'zustand';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, query, where, orderBy, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthStore } from './authStore';
import { formatYMD, esFinDeSemana, esFechaPasadaOHoy, formatearFechaCorta } from '../utils/dateUtils';

export const useVacacionesStore = create((set, get) => {
  let unsubscribeSolicitudes = null;
  let unsubscribeFestivos = null;

  return {
    // Estado principal
    añoFestivosActual: new Date().getFullYear(),
    solicitudesVacaciones: [],
    festivos: [],
    loading: false,
    error: null,

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
    loadFestivos: (año = new Date().getFullYear()) => {
      if (unsubscribeFestivos) {
        unsubscribeFestivos();
        unsubscribeFestivos = null;
      }

      unsubscribeFestivos = onSnapshot(
        doc(db, 'DIAS_FESTIVOS', año.toString()),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            set({ festivos: data.festivos || [] });
          } else {
            set({ festivos: [] });
          }
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
        const { userProfile } = useAuthStore.getState();
        
        if (!userProfile) {
          throw new Error('Datos de usuario no disponibles');
        }

        if (!motivoCancelacion || motivoCancelacion.trim() === '') {
          throw new Error('Debes proporcionar un motivo para la cancelación');
        }

        // Actualizar estado a "cancelado", añadir fecha y motivo
        await updateDoc(doc(db, 'VACACIONES', solicitud.id), {
          estado: 'cancelado',
          fechaCancelacion: formatYMD(new Date()),
          motivoCancelacion: motivoCancelacion.trim(), // ✅ Nuevo campo
          comentariosAdmin: solicitud.comentariosAdmin || '',
          updatedAt: new Date()
        });

        // Restaurar las horas según el estado previo
        const userDocRef = doc(db, 'USUARIOS', solicitud.solicitante);
        
        if (solicitud.estado === 'pendiente') {
          // Si era pendiente: restar de pendientes
          await updateDoc(userDocRef, {
            'vacaciones.pendientes': userProfile.vacaciones.pendientes - solicitud.horasSolicitadas
          });
        } else if (solicitud.estado === 'aprobada') {
          // Si era aprobada: sumar a disponibles
          await updateDoc(userDocRef, {
            'vacaciones.disponibles': userProfile.vacaciones.disponibles + solicitud.horasSolicitadas
          });
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

        await updateDoc(doc(db, 'VACACIONES', solicitudId), {
          estado: nuevoEstado,
          comentariosAdmin: comentariosAdmin || '',
          fechaAprobacionDenegacion: formatYMD(new Date()),
          updatedAt: new Date()
        });

        if (nuevoEstado === 'aprobada') {
          const userDocRef = doc(db, 'USUARIOS', solicitud.solicitante);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const nuevasDisponibles = userData.vacaciones.disponibles - solicitud.horasSolicitadas;
            const nuevasPendientes = userData.vacaciones.pendientes - solicitud.horasSolicitadas;
            
            await updateDoc(userDocRef, {
              'vacaciones.disponibles': nuevasDisponibles,
              'vacaciones.pendientes': nuevasPendientes
            });
          }
        } else if (nuevoEstado === 'denegada') {
          const userDocRef = doc(db, 'USUARIOS', solicitud.solicitante);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const nuevasPendientes = userData.vacaciones.pendientes - solicitud.horasSolicitadas;
            
            await updateDoc(userDocRef, {
              'vacaciones.pendientes': nuevasPendientes
            });
          }
        }

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
        
        //  Usar obtenerDatosUsuarios en lugar de getDoc individuales
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
        const disponibilidad = await get().calcularDisponibilidadPorFecha(fecha);

      if (!disponibilidad || !disponibilidad.porPuesto || typeof disponibilidad.porPuesto !== 'object') {
      return [];
    }
        const conflictos = [];
        
        // Umbrales por defecto (se puede configurar)
        const umbrales = {
          'Fresador': 4,
          'Tornero': 3,
          'Operario CNC': 3,
          'Montador': 2,
          'Administrativo': 2,
          'Diseñador': 2,
          'Ayudante de Taller': 2
        };
        
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


  cancelarSolicitudParcial: async (solicitudOriginal, diasACancelar, motivoCancelacion) => {
    try {
      const { userProfile } = useAuthStore.getState();
      
      if (!motivoCancelacion || motivoCancelacion.trim() === '') {
        throw new Error('Debes proporcionar un motivo para la cancelación parcial');
      }

      if (!Array.isArray(diasACancelar) || diasACancelar.length === 0) {
        throw new Error('Debes seleccionar al menos un día para cancelar');
      }

      if (diasACancelar.length >= solicitudOriginal.fechas.length) {
        throw new Error('No puedes cancelar todos los días. Para eso usa cancelación completa');
      }

      // Calcular horas a devolver (8 horas por día cancelado)
      const horasADevolver = diasACancelar.length * 8;
      
      // 1. Crear nueva solicitud de cancelación parcial
      const solicitudCancelacion = {
        solicitante: solicitudOriginal.solicitante,
        fechas: diasACancelar.sort(),
        horasSolicitadas: horasADevolver,
        horasDisponiblesAntesSolicitud: userProfile.vacaciones.disponibles,
        horasDisponiblesTrasAprobacion: userProfile.vacaciones.disponibles + horasADevolver,
        fechaSolicitud: formatYMD(new Date()),
        fechaSolicitudOriginal: formatYMD(new Date()),
        estado: 'cancelado',
        fechaCancelacion: formatYMD(new Date()),
        motivoCancelacion: `CANCELACIÓN PARCIAL: ${motivoCancelacion.trim()}`,
        comentariosSolicitante: `Cancelación parcial de solicitud original. Días cancelados: ${diasACancelar.map(fecha => formatearFechaCorta(fecha)).join(', ')}`,
        comentariosAdmin: `Cancelación parcial procesada el ${formatearFechaCorta(formatYMD(new Date()))}.`,
        esCancelacionParcial: true, // Marcador para identificar este tipo de solicitud
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 2. Crear la nueva solicitud de cancelación
      const docRefCancelacion = await addDoc(collection(db, 'VACACIONES'), solicitudCancelacion);
      const diasYaCancelados = solicitudOriginal.diasCancelados || [];
      const diasCanceladosActualizados = [...diasYaCancelados, ...diasACancelar].sort();

      await updateDoc(doc(db, 'VACACIONES', solicitudOriginal.id), {
        diasCancelados: diasCanceladosActualizados,
        comentariosAdmin: (solicitudOriginal.comentariosAdmin || '') + 
          `\n\n*CANCELACIÓN PARCIAL (${formatearFechaCorta(formatYMD(new Date()))}): Se cancelaron ${diasACancelar.length} días de esta solicitud: ${diasACancelar.map(fecha => formatearFechaCorta(fecha)).join(', ')}. \nMotivo: ${motivoCancelacion.trim()}`,
        updatedAt: new Date()
      });

      // 4. Devolver horas al saldo del empleado
      const userDocRef = doc(db, 'USUARIOS', solicitudOriginal.solicitante);
      await updateDoc(userDocRef, {
        'vacaciones.disponibles': userProfile.vacaciones.disponibles + horasADevolver
      });

      return {
        exito: true,
        solicitudCancelacionId: docRefCancelacion.id,
        horasDevueltas: horasADevolver,
        diasCancelados: diasACancelar.length,
        diasOriginales: solicitudOriginal.fechas.length,
        totalDiasCancelados: diasCanceladosActualizados.length 
      };

    } catch (error) {
      console.error('Error en cancelación parcial:', error);
      set({ error: error.message });
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
