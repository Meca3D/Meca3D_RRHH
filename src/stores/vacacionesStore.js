// stores/vacacionesStore.js
import { create } from 'zustand';
import { arrayUnion, collection, onSnapshot, doc, updateDoc, writeBatch, query, where, orderBy, getDoc, getDocs, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthStore } from './authStore';
import { formatYMD, esFinDeSemana, esFechaPasadaOHoy} from '../utils/dateUtils';
import { formatearTiempoVacasLargo } from '../utils/vacacionesUtils';

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
          
          if (userEmail) {   
            solicitudesQuery = query(
              collection(db, 'VACACIONES'),
              where('solicitante', '==', userEmail),
              orderBy('fechaSolicitud', 'desc')
            );       
            
          } else if (isAdminOrOwner()) {
            solicitudesQuery = query(
              collection(db, 'VACACIONES'),
              orderBy('fechaSolicitud', 'desc')
            );

          } else { 
            return []
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


    // Obtener días cancelados de todas las cancelacionesParciales
    obtenerDiasCancelados: (cancelaciones) => {
      if (!Array.isArray(cancelaciones)) return [];
      return cancelaciones.reduce((acc, cancelacion) => {
        return [...acc, ...(cancelacion.fechasCanceladas || [])];
      }, []);
    },


    // Obtener días disfrutados (pasados y no cancelados)
    obtenerDiasDisfrutados: (solicitud) => {
      if (solicitud.esVenta) return [];
      if (!Array.isArray(solicitud.fechasActuales)) return [];
      if (solicitud.fechasActuales.length===0) return [];
      if (!['aprobada','cancelada'].includes(solicitud.estado)) return [];
      
      return solicitud.fechasActuales.filter(fecha => esFechaPasadaOHoy(fecha));
    },


    puedeCancelarDias: (solicitud, esAdmin = false) => {
    if (solicitud.estado !== 'aprobada') return false;
    
    // Las ventas siempre se pueden cancelar si están aprobadas
    if (solicitud.esVenta&&esAdmin) return true;
    
    // Horas sueltas no se pueden cancelar
    const esHorasSueltas = solicitud.horasSolicitadas < 8 && solicitud.fechasActuales?.length === 1;
    if (esHorasSueltas&&esAdmin) return true;
    
    // Verificar que hay días disponibles para cancelar
    const diasDisponibles = (solicitud.fechasActuales || []).filter(fecha => {
      const esFechaPasada = esFechaPasadaOHoy(fecha);
      return esAdmin || !esFechaPasada;
    });
    
    return diasDisponibles.length > 0;
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
 crearSolicitudVacaciones: async (solicitudData,esAdmin=false) => {
  try {
    let res={}
    if (esAdmin)  {
      res.aplicar=true}
    else {
    // Para empleados, evaluar auto-aprobación ANTES de crear (usa datos locales para evaluación)
    const solicitudTemp = { // Objeto temporal para evaluación
      ...solicitudData,
      id: 'temp', // ID placeholder
      estado: 'pendiente',
      fechaSolicitud: formatYMD(new Date()),
    };
    res = await get().evaluarAutoAprobacion(solicitudTemp);
    }

    const nuevaSolicitud = {
      ...solicitudData,
      fechaSolicitud: formatYMD(new Date()),
      fechasActuales: solicitudData.esVenta ? [] : [...solicitudData.fechas], 
      cancelaciones: [],
      ampliaciones: [], 
      estado: res.aplicar ? 'aprobada' : 'pendiente',
      comentariosAdmin: res.aplicar 
                          ? esAdmin
                            ? solicitudData.comentariosAdmin
                            : (get().configVacaciones?.autoAprobar?.mensaje || 'Aprobado automáticamente por política activa.') 
                            : '',
      fechaAprobacionDenegacion: res.aplicar ? formatYMD(new Date()) : '',
      timestampAprobacionDenegacion: res.aplicar ? new Date() : '', 
      esAdmin: esAdmin,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const userDocRef = doc(db, 'USUARIOS', solicitudData.solicitante);
    let solicitudId;

    // Transacción para crear solicitud y actualizar saldo atómicamente
    await runTransaction(db, async (transaction) => {
      // Obtener saldo fresco del solicitante
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists()) {
        throw new Error('Usuario no encontrado');
      }
      const currentVacaciones = userDoc.data().vacaciones || { disponibles: 0, pendientes: 0 };

      // Crear referencia para nueva solicitud (genera ID client-side)
      const newSolicitudRef = doc(collection(db, 'VACACIONES'));
      solicitudId = newSolicitudRef.id;

      // Preparar datos con saldo antes/después si auto-aprobada
      let solicitudFinal = { ...nuevaSolicitud };
      if (res.aplicar) {
        solicitudFinal.horasDisponiblesAntes = currentVacaciones.disponibles;
        solicitudFinal.horasDisponiblesDespues = currentVacaciones.disponibles - solicitudData.horasSolicitadas;
      }

      // Escribir solicitud
      transaction.set(newSolicitudRef, solicitudFinal);

      // Actualizar saldo basado en si auto-aprobada o no
      let newVacaciones = { ...currentVacaciones };
      if (res.aplicar) {
        // Auto-aprobada: solo restar de disponibles (neto cero en pendientes)
        newVacaciones.disponibles -= solicitudData.horasSolicitadas;
      } else {
        // Pendiente: sumar a pendientes
        newVacaciones.pendientes += solicitudData.horasSolicitadas;
      }

      transaction.update(userDocRef, {
        vacaciones: newVacaciones,
        updatedAt: new Date()
      });
    });

          // Transacción completada, enviar notificaciones
      try {
        const { sendNotification, userProfile } = useAuthStore.getState();
        const nombreSolicitante = (userProfile?.nombre || solicitudData.solicitante);
        if (res.aplicar) {
          // ✅ Auto-aprobada: Notificar al solicitante
          await sendNotification({
            empleadoEmail: solicitudData.solicitante,
            title: '✅ Solicitud de vacaciones aprobada',
            body: solicitudData.esVenta 
              ? `Tu venta de ${formatearTiempoVacasLargo(solicitudData.horasSolicitadas)} ha sido aprobada`
              : `Tu solicitud de ${formatearTiempoVacasLargo(solicitudData.horasSolicitadas)} ha sido aprobada`,
            url: '/vacaciones/solicitudes',
            type: 'vacaciones_aprobada'
          });
        } else {
          // solicitud en estado pendiente: Notificar a admins via Cloud Function
          await fetch('/.netlify/functions/notifyAdmins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accion:'solicitud',
              solicitante: solicitudData.solicitante, // Email (para buscar en Firestore)
              nombreSolicitante: nombreSolicitante, 
              diasSolicitados: formatearTiempoVacasLargo(solicitudData.horasSolicitadas),
              esVenta: solicitudData.esVenta,
              horasSolicitadas: solicitudData.horasSolicitadas
            })
          });
        }
      } catch (notifError) {
        console.error('Error enviando notificaciones:', notifError);
      }

      return solicitudId;


  } catch (error) {
    set({ error: error.message });
    throw error;
  }
},

    // Eliminar solicitud de vacaciones
    eliminarSolicitudVacaciones: async (solicitudId, horasSolicitadas, solicitanteEmail) => {
          try {
            const solicitudRef = doc(db, 'VACACIONES', solicitudId);
            const userDocRef = doc(db, 'USUARIOS', solicitanteEmail);

            // Usar transacción para eliminar solicitud y actualizar saldo
            await runTransaction(db, async (transaction) => {
              // Leer saldo actual del usuario
              const userDoc = await transaction.get(userDocRef);
              if (!userDoc.exists()) {
                throw new Error('Usuario no encontrado');
              }
              const currentVacaciones = userDoc.data().vacaciones || { disponibles: 0, pendientes: 0 };

              // Eliminar solicitud
              transaction.delete(solicitudRef);

              // Actualizar saldo del usuario (restar de pendientes)
              transaction.update(userDocRef, {
                'vacaciones.pendientes': currentVacaciones.pendientes - horasSolicitadas,
                updatedAt: new Date()
              });
            });

            return true;
          } catch (error) {
            set({ error: error.message });
            throw error;
          }
        },

/*         // Cancelar Solicitudes de Vacaciones
        cancelarSolicitudVacaciones: async (solicitud, motivoCancelacion, esAdmin = false, esAuto = false) => {
      try {
        if (!motivoCancelacion || motivoCancelacion.trim() === '') {
          throw new Error('Debes proporcionar un motivo para la cancelación');
        }
        // ✅ OBTENER cancelaciones parciales previas
        const cancelacionesPrevias = solicitud.cancelacionesParciales || [];
        const diasYaCancelados = get().obtenerDiasCancelados(cancelacionesPrevias);

        // ✅ CALCULAR días restantes no cancelados y no disfrutados
        const diasDisponibles = solicitud.fechas.filter(fecha => {
          const yaFueCancelado = diasYaCancelados.includes(fecha);
          const esFechaPasada = esFechaPasadaOHoy(fecha);
          return !yaFueCancelado && !esFechaPasada;
        });

        // Calcular horas correctamente
        let horasADevolver;
        if (solicitud.estado === 'pendiente') {
          horasADevolver = solicitud.horasSolicitadas
        } else {
            if (solicitud.horasSolicitadas<8) {
              horasADevolver=solicitud.horasSolicitadas}
              else {horasADevolver = diasDisponibles.length * 8}
        }

        const solicitudRef = doc(db, 'VACACIONES', solicitud.id);
        const userDocRef = doc(db, 'USUARIOS', solicitud.solicitante);

        // Usar transacción para actualizar solicitud y saldo
        await runTransaction(db, async (transaction) => {
          // Leer saldo actual del usuario
          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) {
            throw new Error('Usuario no encontrado');
          }
          const saldoAntes = userDoc.data().vacaciones || { disponibles: 0, pendientes: 0 };
          const saldoDespues = saldoAntes.disponibles + (solicitud.estado === 'aprobada' ? horasADevolver : 0);
          const motivo=esAdmin?('Jefe: '+motivoCancelacion.trim()):motivoCancelacion.trim()

          // ✅ ACTUALIZAR estado a "cancelado"
          transaction.update(solicitudRef, {
            estado: 'cancelado',
            fechaCancelacion: formatYMD(new Date()),
            fechasCanceladas: solicitud.estado==="pendiente" ? solicitud.fechas : diasDisponibles,
            motivoCancelacion: motivo,
            horasDisponiblesAntesCancelacion: saldoAntes.disponibles, 
            horasDisponiblesDespuesCancelacion: saldoDespues,  
            updatedAt: new Date()
          });

          if (horasADevolver > 0) {
            const newVacaciones = { ...saldoAntes };
            if (solicitud.estado === 'pendiente') {
              newVacaciones.pendientes -= horasADevolver;
            } else if (solicitud.estado === 'aprobada') {
              newVacaciones.disponibles += horasADevolver;
            }
            transaction.update(userDocRef, {
              'vacaciones': newVacaciones,
              updatedAt: new Date()
            });
          }
        });
        // Notificaciones según quién canceló
        try {
          const { sendNotification, userProfile } = useAuthStore.getState();
          const nombreSolicitante = formatearNombre(userProfile.nombre);
          
          if ((esAdmin || esAuto ) && solicitud.solicitante !== useAuthStore.getState().user?.email) {
            // Caso 1: Admin cancela solicitud de un empleado → Notificar al empleado
            await sendNotification({
              empleadoEmail: solicitud.solicitante,
              title: '⚠️ Solicitud de vacaciones cancelada',
              body: `❌ Tus vacaciones han sido canceladas por el administrador.
              \n\n 📅 Cancelado: ${diasDisponibles.join(", ")} \n\n💬 Motivo: ${motivoCancelacion}`,
              url: '/vacaciones/solicitudes',
              type: 'vacaciones_cancelada_admin'
            });
          } else if (!esAdmin && !esAuto) {
            // Caso 2: Trabajador cancela su propia solicitud → Notificar a admins
            const diasSolicitados = solicitud.esVenta 
              ? `${formatearTiempoVacasLargo(solicitud.horasSolicitadas)}` 
              : `${formatearTiempoVacasLargo(solicitud.horasSolicitadas)}`;
            
            await fetch('/.netlify/functions/notifyAdmins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                solicitante: solicitud.solicitante,
                nombreSolicitante: nombreSolicitante,
                diasSolicitados: diasSolicitados,
                esVenta: solicitud.esVenta,
                accion: 'cancelacion',
                mensaje: ` ${nombreSolicitante} ha cancelado su solicitud de vacaciones.\n\n📅 Cancelado: ${formatearTiempoVacasLargo(horasADevolver)}\n\n💬 Motivo: ${motivoCancelacion}`
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
    }, */

    // Actualizar solicitud
 actualizarSolicitudVacaciones: async (solicitudId, datosActualizados, solicitudOriginal) => {
      try {

    //  solo se pueden editar solicitudes pendientes
    if (solicitudOriginal.estado !== 'pendiente') {
      throw new Error('Solo se pueden editar solicitudes pendientes. Para modificar una solicitud aprobada o cancelada, cancélala y crea una nueva.');
    }
        // Evaluar si se aplicará auto-aprobación después de la edición
        const solicitudTemp = { 
          id: solicitudId, 
          ...datosActualizados,
          solicitante: solicitudOriginal.solicitante,
          estado: 'pendiente', // Asumir pendiente inicialmente
          fechaSolicitud: solicitudOriginal.fechaSolicitud // Mantener original para evaluación
        };
        const resAuto = await get().evaluarAutoAprobacion(solicitudTemp);

        const datosFinales = {
          ...datosActualizados,
          fechaEdicion: formatYMD(new Date()),
          fechasActuales: datosActualizados.fechas ? [...datosActualizados.fechas] : solicitudOriginal.fechasActuales,
          updatedAt: new Date(),
          estado: resAuto.aplicar ? 'aprobada' : 'pendiente',
          comentariosAdmin: resAuto.aplicar ? (get().configVacaciones?.autoAprobar?.mensaje || 'Aprobado automáticamente por política activa.') : '',
          fechaAprobacionDenegacion: resAuto.aplicar ? formatYMD(new Date()) : '',
          timestampAprobacionDenegacion: resAuto.aplicar ? new Date() : '', 
          horasDisponiblesAntes: '', // Se calculará en transacción si aplica
          horasDisponiblesDespues: '' // Se calculará en transacción si aplica
        };

        const diferencia = datosActualizados.horasSolicitadas - solicitudOriginal.horasSolicitadas;
        const solicitudRef = doc(db, 'VACACIONES', solicitudId);
        const userDocRef = doc(db, 'USUARIOS', solicitudOriginal.solicitante);

        // Usar transacción para actualizar solicitud y saldo
        await runTransaction(db, async (transaction) => {
          // Leer datos actuales del usuario
          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) {
            throw new Error('Usuario no encontrado');
          }
          const currentVacaciones = userDoc.data().vacaciones || { disponibles: 0, pendientes: 0 };

        // Preparar datos finales con saldo si auto-aprobada
        let solicitudFinal = { ...datosFinales };

            // Calcular nuevo saldo
            let newVacaciones = { ...currentVacaciones };

            if (solicitudOriginal.estado === 'pendiente') {
              // Si era pendiente: ajustar solo pendientes
              if (diferencia !== 0) {
                newVacaciones.pendientes += diferencia;
              }
            } 

            if (resAuto.aplicar) {
              // Si se auto-aprueba: calcular campos de saldo y restar de disponibles/pendientes
        solicitudFinal.horasDisponiblesAntes = currentVacaciones.disponibles;
        solicitudFinal.horasDisponiblesDespues = currentVacaciones.disponibles - datosActualizados.horasSolicitadas;
              
              // Restar las horas nuevas del saldo del usuario
              newVacaciones.disponibles -= datosActualizados.horasSolicitadas;
              newVacaciones.pendientes -= datosActualizados.horasSolicitadas;
            }

            // ✅ Actualizar solicitud CON los campos de saldo ya calculados
            transaction.update(solicitudRef, solicitudFinal);

            // Actualizar saldo del usuario
            transaction.update(userDocRef, {
              'vacaciones': newVacaciones,
              updatedAt: new Date()
            });
        });

        return true;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    getFechasVivasDeSolicitud: (solicitud) => {
      return Array.isArray(solicitud?.fechasActuales) ? [...solicitud.fechasActuales].sort() : [];
    },

    obtenerSolicitudCompleta: async (solicitudId) => {
      try {
        const solicitudDoc = await getDoc(doc(db, 'VACACIONES', solicitudId));
        if (!solicitudDoc.exists()) {
          throw new Error('Solicitud no encontrada');
        }
        
        return { id: solicitudDoc.id, ...solicitudDoc.data() };

      } catch (error) {
        console.error('Error obteniendo solicitud completa:', error);
      }
    },

// Cambiar estado solicitud (admin)
    cambiarEstadoSolicitud: async (solicitudId, nuevoEstado, comentariosAdmin, solicitud) => {
      try {
        const { isAdminOrOwner } = useAuthStore.getState();
        
        if (!isAdminOrOwner()) {
          throw new Error('Sin permisos para cambiar estado de solicitudes');
        }

        const solicitudRef = doc(db, 'VACACIONES', solicitudId);
        const userDocRef = doc(db, 'USUARIOS', solicitud.solicitante);

        // Usar transacción para actualizar estado, saldo y crear hora extra atómicamente
        await runTransaction(db, async (transaction) => {
          // Obtener saldo actual del empleado ANTES del cambio
          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) {
            throw new Error('Usuario no encontrado');
          }
          
          const userData = userDoc.data();
          const saldoAntes = userData.vacaciones || { disponibles: 0, pendientes: 0 };

          let saldoDespues = { ...saldoAntes };

          let updateData = {
            estado: nuevoEstado,
            comentariosAdmin: comentariosAdmin || '',
            fechaAprobacionDenegacion: formatYMD(new Date()),
            timestampAprobacionDenegacion: new Date(), 
            updatedAt: new Date(),
            horasDisponiblesAntes: saldoAntes.disponibles,
            horasDisponiblesDespues: saldoAntes.disponibles // Default, se ajusta si aplica
          };

          if (nuevoEstado === 'aprobada') {
            saldoDespues.disponibles -= solicitud.horasSolicitadas;
            saldoDespues.pendientes -= solicitud.horasSolicitadas;
            updateData.horasDisponiblesDespues = saldoDespues.disponibles;
          } else if (nuevoEstado === 'denegada') {
            saldoDespues.pendientes -= solicitud.horasSolicitadas;      
          }
      
        // ✅ Si es una solicitud de venta aprobada, crear registro de horas extra
        if (nuevoEstado === 'aprobada' && solicitud?.esVenta === true) {
        const tarifaNormal = userData.tarifasHorasExtra?.normal;

        // Solo crear registro si tiene tarifa configurada
        if (tarifaNormal && tarifaNormal > 0) {
          const fechaAprobacion = formatYMD(new Date());
          const horasVendidas = solicitud.horasSolicitadas || 0;
          const importe = horasVendidas * tarifaNormal;
        
          // Generar referencia del nuevo documento
          const newHoraExtraRef = doc(collection(db, 'HORAS_EXTRA'));

          const horaExtraData = {
            empleadoEmail: solicitud.solicitante,
            fecha: fechaAprobacion,
            horas: horasVendidas,
            minutos: 0,
            horasDecimales: horasVendidas,
            tipo: 'normal',
            tarifa: tarifaNormal,
            importe: importe,
            esVenta: true,
            vacacionesId: solicitudId,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Crear el documento dentro de la transacción
          transaction.set(newHoraExtraRef, horaExtraData);
          // Añadir el ID de hora extra a la solicitud de vacaciones
          updateData.horasExtraId = newHoraExtraRef.id;        
        }
      }
          // Actualizar solicitud
          transaction.update(solicitudRef, updateData);

          // Actualizar saldo del usuario
          transaction.update(userDocRef, {
            'vacaciones': saldoDespues,
            updatedAt: new Date()
          });
    })
    // Notificar al solicitante del cambio de estado
    try {
      const { sendNotification } = useAuthStore.getState();
      
      if (nuevoEstado === 'aprobada') {
        await sendNotification({
          empleadoEmail: solicitud.solicitante,
          title: `✅ Solicitud de ${solicitud.esVenta?'venta de ':''}vacaciones aprobada`,
          body: solicitud.esVenta
            ? `Tu venta de ${formatearTiempoVacasLargo(solicitud.horasSolicitadas)} ha sido aprobada ${solicitud.cantidadARecibir?'. Disfruta los '+solicitud.cantidadARecibir+'€':''}`
            : `Tu solicitud de ${formatearTiempoVacasLargo(solicitud.horasSolicitadas)} ha sido aprobada`,
          url: '/vacaciones/solicitudes',
          type: 'vacaciones_aprobada'
        });
      } else if (nuevoEstado === 'denegada') {
        await sendNotification({
          empleadoEmail: solicitud.solicitante,
          title: `❌ Solicitud de ${solicitud.esVenta?'venta de ':''}vacaciones denegada`,
          body: comentariosAdmin || 'Tu solicitud ha sido denegada',
          url: '/vacaciones/solicitudes',
          type: 'vacaciones_denegada'
        });
      }
    } catch (notifError) {
      console.error('Error enviando notificación:', notifError);
      // No bloquear el cambio de estado
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
          const primeraFecha = solicitud?.fechas[0];
          return solicitud.estado === 'pendiente' && esFechaPasadaOHoy(primeraFecha) && !solicitud.esVenta;
        });

        if (solicitudesPendientesCaducadas.length === 0) {
          return { procesadas: 0 };
        }

        console.log(`🔄 Procesando ${solicitudesPendientesCaducadas.length} solicitudes caducadas`);
        const { sendNotification } = useAuthStore.getState();
        let procesadas = 0;
        for (const solicitud of solicitudesPendientesCaducadas) {
          try {
            // ✅ pasar el objeto solicitud completo y el motivo
            await get().eliminarSolicitudVacaciones(
              solicitud.id,
              solicitud.horasSolicitadas,
              solicitud.solicitante
            )           
            procesadas++;
            await sendNotification({
                empleadoEmail: solicitud.solicitante,
                title: '⚠️ Eliminacion de solicitud de Vacaciones',
                body: `❌ Solicitud de vacaciones eliminada automáticamente. No pudo ser revisada antes de las fechas solicitadas`,
                url: '/vacaciones/solicitudes',
                type: 'vacaciones_eliminada'
              });
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

    cancelarVentaVacaciones: async (solicitud, motivoCancelacion, esAdmin = false) => {
      try {
        const { userProfile, user } = useAuthStore.getState();
        
        // Validaciones
        if (!motivoCancelacion?.trim()) {
          throw new Error('Debe proporcionar un motivo de cancelación');
        }

        if (!solicitud.esVenta) {
          throw new Error('Esta función solo es para cancelar ventas de vacaciones');
        }

        if (solicitud.estado !== 'aprobada' && solicitud.estado !== 'pendiente') {
          throw new Error('Solo se pueden cancelar ventas aprobadas o pendientes');
        }

        // Si está pendiente, simplemente eliminar la solicitud
        if (solicitud.estado === 'pendiente') {
          await get().eliminarSolicitudVacaciones(solicitud.id, solicitud.horasSolicitadas,solicitud.solicitante);
          return { success: true, eliminada: true };
        }
        
        const empleadoActual = esAdmin ? solicitud.solicitante : user?.email;
        let saldoAntes = 0;
        let saldoDespues = 0;
        const horasADevolver = solicitud.horasSolicitadas;
        // Si está aprobada, crear registro de cancelación

        // Ejecutar transacción
        await runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, 'USUARIOS', solicitud.solicitante);
        // Obtener saldo actual del empleado ANTES de la cancelación
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error('Empleado no encontrado');
        }
        saldoAntes = userDoc.data().vacaciones?.disponibles || 0;
        saldoDespues = saldoAntes + horasADevolver;

        const registroCancelacion = {
          createdAt: new Date(),
          esAdmin,
          fechaCancelacion: formatYMD(new Date()),
          fechasCanceladas: [],
          esCancelacionTotal: true,
          horasDevueltas: horasADevolver,
          horasDisponiblesAntesCancelacion: saldoAntes,
          horasDisponiblesDespuesCancelacion: saldoDespues,
          motivoCancelacion: motivoCancelacion.trim(),
          procesadaPor: userProfile?.nombre
        };

        const solicitudRef = doc(db, 'VACACIONES', solicitud.id);

          // Actualizar solicitud a cancelado
          transaction.update(solicitudRef, {
            estado: 'cancelado',
            horasExtraId: "",
            cancelaciones: arrayUnion(registroCancelacion),
            updatedAt: new Date()
          });

          // Devolver saldo al empleado
          transaction.update(userDocRef, {
            'vacaciones.disponibles': saldoDespues,
            updatedAt: new Date()
          });

          // Si existe registro en HORAS_EXTRA, eliminarlo
          if (solicitud.horasExtraId) {
            const horaExtraRef = doc(db, 'HORAS_EXTRA', solicitud.horasExtraId);
            transaction.delete(horaExtraRef);
          }
        });

        // Notificaciones según quién canceló
            try {
              const { sendNotification, userProfile } = useAuthStore.getState();
              const nombreSolicitante = (userProfile.nombre);
              
              if (esAdmin && solicitud.solicitante !== empleadoActual) {
                // Admin cancela solicitud de un empleado → Notificar al empleado
                await sendNotification({
                  empleadoEmail: solicitud.solicitante,
                  title: '⚠️ Cancelación de venta vacaciones',
                  body: `❌ El administrador ha cancelado tu venta de ${formatearTiempoVacasLargo(horasADevolver)} de tus vacaciones. \n\n💬 Motivo: ${motivoCancelacion}`,
                  url: '/vacaciones/solicitudes',
                  type: 'vacaciones_cancelada'
                });
              } else if (!esAdmin) {
                // Caso 2: Trabajador cancela su propia solicitud → Notificar a admins
                await fetch('/.netlify/functions/notifyAdmins', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    solicitante: solicitud.solicitante,
                    nombreSolicitante: nombreSolicitante,
                    diasSolicitados: `${formatearTiempoVacasLargo(horasADevolver)}`,
                    esVenta: false,
                    accion: 'cancelacion_vacaciones',
                    mensaje: `❌ ${nombreSolicitante} ha cancelado la venta de ${formatearTiempoVacasLargo(horasADevolver)} de sus vacaciones. \n\n💬 Motivo: ${motivoCancelacion}`
                  })
                });
              }
            } catch (notifError) {
              console.error('Error enviando notificación:', notifError);
            }

            return {
              exito: true,
              horasDevueltas: horasADevolver,
              saldoAntes,                                           
              saldoDespues 
            };

      } catch (error) {
        console.error('❌ Error al cancelar venta:', error);
        throw error;
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
        const solicitudesEnFecha = solicitudesAprobadas.filter(s => {
          if (!Array.isArray(s.fechasActuales) || !s.fechasActuales.includes(fecha)) return false;
          const set = s._diasCanceladosSet;
          return !(set && set.has(fecha));
        });
        
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
    detectarConflictos: async (fecha) => {
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
          const {loadConfigVacaciones, configVacaciones } = get();
          if (!configVacaciones) {
              const unsubscribe = loadConfigVacaciones();
              return () => unsubscribe()}
          
          if (!configVacaciones?.autoAprobar?.habilitado) {
            return { aplicar: false, motivo: 'Autoaprobación deshabilitada' };
          }


          const modo = configVacaciones.autoAprobar.modo || 'todas';
          const maxHoras = parseInt(configVacaciones.autoAprobar.maxHoras || 0, 10);
          const noEsVenta = (modo === 'noVentas') 
            ? !solicitud.esVenta 
            : true;

          const cumpleHoras = (modo === 'porHoras' || modo === 'porHorasYsinConflictos')
            ? (solicitud.horasSolicitadas || 0) <= maxHoras
            : true;

          const cumpleConflictos = (modo === 'sinConflictos' || modo === 'porHorasYsinConflictos')
            ? await (async () => {
                // Si alguna fecha tiene conflictos, no cumple
                const conflictosPorDia = await Promise.all(
                  (solicitud.fechasActuales || []).map(f => get().detectarConflictos(f))
                );
                return conflictosPorDia.every(arr => !arr || arr.length === 0);
              })()
            : true;

          const aplicar = (modo === 'todas') ? true : (modo === 'noVentas')
                      ? noEsVenta :(cumpleHoras && cumpleConflictos);

          return { aplicar, motivo: aplicar ? 'ok' : 'reglas no cumplidas' };
        },

        autoAprobarSiCorresponde: async (solicitud) => {
          const { evaluarAutoAprobacion, cambiarEstadoSolicitud, configVacaciones } = get();
          const res = await evaluarAutoAprobacion(solicitud);
          if (!res.aplicar) return { aplicado: false, motivo: res.motivo };

          const mensaje = (configVacaciones?.autoAprobar?.mensaje || 'Aprobado automáticamente por política activa.');
          await cambiarEstadoSolicitud(solicitud.id, 'aprobada', mensaje, solicitud,true);

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
          return solicitud.fechasActuales?.some(fecha => {
            const fechaAño = new Date(fecha).getFullYear();
            return fechaAño === año;
          });
        });
        
        // Ordenar por la primera fecha actual (no cancelada)
      return solicitudesFiltradas.sort((a, b) => {
        const fechaA = a.fechasActuales?.[0]
        const fechaB = b.fechasActuales?.[0]
        return new Date(fechaA) - new Date(fechaB);
      });

        
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
          orderBy("updatedAt", "desc")
        );
        
        // Aplicar filtros si se especifican
        if (filtros.estado && filtros.estado !== 'todos') {
          solicitudesQuery = query(
            collection(db, 'VACACIONES'),
            where('estado', '==', filtros.estado),
            orderBy('updatedAt', 'desc')
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
        
        if (filtros.año && filtros.año !== 'todos') {
          solicitudes = solicitudes.filter(s => {
            // Filtrar por año de última modificación (updatedAt)
            const fechaModificacion = s.updatedAt?.toDate?.() || s.updatedAt || new Date(s.fechaSolicitud);
            const añoModificacion = new Date(fechaModificacion).getFullYear();
            return añoModificacion === filtros.año;
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
          const fechasFormatted = s.fechasActuales ? s.fechasActuales.join(', ') : '';
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

    ampliarDiasSolicitudVacaciones: async (solicitud, nuevasFechas, motivoAmpliacion, esAdmin = false) => {
      try {
        const { user, userProfile } = useAuthStore.getState();
        
        // Validaciones
        if (!motivoAmpliacion?.trim()) {
          throw new Error('Debe proporcionar un motivo para la ampliación');
        }

        if (solicitud.estado !== 'aprobada') {
          throw new Error('Solo se pueden ampliar solicitudes aprobadas');
        }

        if (!esAdmin) {
          throw new Error('Solo los administradores pueden ampliar solicitudes');
        }

        if (solicitud.esVenta || solicitud.esAjusteSaldo) {
          throw new Error('Las Ventas o Ajustes de saldo no pueden ampliarse');
        }

        if (!Array.isArray(nuevasFechas) || nuevasFechas.length === 0) {
          throw new Error('Debe seleccionar al menos un día para ampliar');
        }

        // Validar que las nuevas fechas no existen ya en fechasActuales
        const fechasDuplicadas = nuevasFechas.filter(fecha => 
          solicitud.fechasActuales.includes(fecha)
        );
        if (fechasDuplicadas.length > 0) {
          throw new Error('Algunas fechas ya están incluidas en la solicitud');
        }

        // Calcular horas a descontar
        let horasADescontar = 0;
        nuevasFechas.forEach(fecha => {
          const esFinde = esFinDeSemana(fecha);
          const esFiesta = get().esFestivo(fecha);
          if (!esFinde && !esFiesta) {
            horasADescontar += 8;
          }
        });

        const horasDisponiblesAntes = userProfile.vacaciones.disponibles;
        
        // Verificar que hay saldo suficiente
        if (horasDisponiblesAntes < horasADescontar) {
          throw new Error(`Saldo insuficiente. Disponibles: ${formatearTiempoVacasLargo(horasDisponiblesAntes)}, Necesarias: ${formatearTiempoVacasLargo(horasADescontar)}`);
        }

        const horasDisponiblesDespues = horasDisponiblesAntes - horasADescontar;

        // Crear nuevas fechasActuales (ordenadas)
        const nuevasFechasActuales = [...solicitud.fechasActuales, ...nuevasFechas].sort();
        const empleadoActual = esAdmin ? solicitud.solicitante : user?.email;
        // Crear registro de ampliación
        const registroAmpliacion = {

          fechaAmpliacion: formatYMD(new Date()),
          fechasAmpliadas: [...nuevasFechas].sort(),
          horasAmpliadas: horasADescontar,
          horasDisponiblesAntesAmpliacion: horasDisponiblesAntes,
          horasDisponiblesDespuesAmpliacion: horasDisponiblesDespues,
          motivoAmpliacion: esAdmin?('Jefe: '+motivoAmpliacion.trim()):motivoAmpliacion.trim(),
          procesadaPor: userProfile.nombre,
          esAdmin,
          createdAt: new Date()
        };

        // Preparar actualización
        const solicitudRef = doc(db, 'VACACIONES', solicitud.id);
        const empleadoRef = doc(db, 'USUARIOS', solicitud.solicitante);

        //const horasActuales = (solicitud.horasActuales || solicitud.horasSolicitadas) + horasADescontar;

        const datosActualizacion = {
          fechasActuales: nuevasFechasActuales,
          //horasActuales: horasActuales,
          ampliaciones: arrayUnion(registroAmpliacion),
          updatedAt: new Date()
        };

        // Ejecutar transacción
        await runTransaction(db, async (transaction) => {
          // Actualizar solicitud
          transaction.update(solicitudRef, datosActualizacion);

          // Descontar saldo del empleado
          transaction.update(empleadoRef, {
            'vacaciones.disponibles': horasDisponiblesDespues,
            updatedAt: new Date()
          });
        });

      // Notificaciones según quién canceló
            try {
              const { sendNotification, userProfile } = useAuthStore.getState();
              const nombreSolicitante = (userProfile.nombre);
              
              if (esAdmin && solicitud.solicitante !== empleadoActual) {
                // Admin cancela solicitud de un empleado → Notificar al empleado
                await sendNotification({
                  empleadoEmail: solicitud.solicitante,
                  title: 'ℹ️ Ampliación de vacaciones',
                  body: `➕ El administrador ha ampliado ${formatearTiempoVacasLargo(horasADescontar)} a tus vacaciones. \n\n💬 Motivo: ${motivoAmpliacion}`,
                  url: '/vacaciones/solicitudes',
                  type: 'vacaciones_ampliada'
                });
              } else if (!esAdmin) {
                // Caso 2: Trabajador amplia su propia solicitud → Notificar a admins
                await fetch('/.netlify/functions/notifyAdmins', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    solicitante: solicitud.solicitante,
                    nombreSolicitante: nombreSolicitante,
                    diasSolicitados: `${formatearTiempoVacasLargo(horasADescontar)}`,
                    esVenta: false,
                    accion: 'ampliacion_vacaciones',
                    mensaje: `➕ ${nombreSolicitante} ha ampliado ${formatearTiempoVacasLargo(horasADescontar)} de sus vacaciones. \n\n💬 Motivo: ${motivoAmpliacion}`
                  })
                });
              }
            } catch (notifError) {
              console.error('Error enviando notificación:', notifError);
            }

            console.log(`✅ Días ampliados correctamente: ${nuevasFechas.length} días`);
            return { success: true, horasAmpliadas: horasADescontar };
          } catch (error) {
            console.error('❌ Error al ampliar días:', error);
            throw error;
          }
    },


    cancelarDiasSolicitudVacaciones: async (solicitud, diasACancelar, motivoCancelacion, esAdmin = false) => {
      try {
        const { user, userProfile } = useAuthStore.getState();
        
        // Validaciones
        if (!motivoCancelacion?.trim()) {
          throw new Error('Debe proporcionar un motivo de cancelación');
        }

        if (solicitud.estado !== 'aprobada') {
          throw new Error('Solo se pueden cancelar días de solicitudes aprobadas');
        }

        // Para solicitudes de venta, usar función específica
        if (solicitud.esVenta || solicitud.esAjusteSaldo) {
          throw new Error('Las ventas o ajustes de saldo no pueden cancelarse con esta función');
        }

        if (!Array.isArray(diasACancelar) || diasACancelar.length === 0) {
          throw new Error('Debe seleccionar al menos un día para cancelar');
        }

        // Validar que los días a cancelar están en fechasActuales
        const diasNoValidos = diasACancelar.filter(dia => !solicitud.fechasActuales.includes(dia));
        if (diasNoValidos.length > 0) {
          throw new Error('Algunos días seleccionados no están disponibles para cancelar');
        }

        // Si no es admin, validar que no sean fechas pasadas
        if (!esAdmin) {
          const diasPasados = diasACancelar.filter(dia => esFechaPasadaOHoy(dia));
          if (diasPasados.length > 0) {
            throw new Error('No puede cancelar días que ya han pasado');
          }
        }

        // Calcular nuevas fechasActuales
        const nuevasFechasActuales = solicitud.fechasActuales.filter(fecha => !diasACancelar.includes(fecha));

        // Verificar si es cancelación total: no quedan días futuros por disfrutar
        const diasFuturosRestantes = nuevasFechasActuales.filter(fecha => !esFechaPasadaOHoy(fecha));
        const esCancelacionTotal = !esAdmin && diasFuturosRestantes.length === 0;


        // Calcular horas a devolver
        let horasADevolver = 0;
        diasACancelar.forEach(fecha => {
          const esFinde = esFinDeSemana(fecha);
          const esFiesta = get().esFestivo(fecha);
          if (!esFinde && !esFiesta) {
            horasADevolver += 8;
          }
        });

        // Si es tipo horas, calcular proporcionalmente
        if (solicitud.horasSolicitadas<8 && solicitud.fechasActuales.length > 0) {
          horasADevolver = solicitud.horasSolicitadas
        }

        const userDocRef = doc(db, 'USUARIOS', solicitud.solicitante);

        // Usar transacción para crear cancelación y actualizar saldo
        const empleadoActual = esAdmin ? solicitud.solicitante : user?.email;
        let saldoAntes = 0;
        let saldoDespues = 0;
        await runTransaction(db, async (transaction) => {
        // Obtener saldo actual del empleado ANTES de la cancelación
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error('Empleado no encontrado');
        }
        saldoAntes = userDoc.data().vacaciones?.disponibles || 0;
        saldoDespues = saldoAntes + horasADevolver;

        // Crear registro de cancelación
        const registroCancelacion = {
          createdAt: new Date(),
          esAdmin,
          fechaCancelacion: formatYMD(new Date()),
          fechasCanceladas: [...diasACancelar].sort(),
          esCancelacionTotal,
          horasDevueltas: horasADevolver,
          horasDisponiblesAntesCancelacion: saldoAntes,
          horasDisponiblesDespuesCancelacion: saldoDespues,
          motivoCancelacion: esAdmin?('Jefe: '+motivoCancelacion.trim()):motivoCancelacion.trim(),
          procesadaPor: userProfile?.nombre,
        };

        // Preparar actualización
        const solicitudRef = doc(db, 'VACACIONES', solicitud.id);

        const datosActualizacion = {
          fechasActuales: nuevasFechasActuales,
          cancelaciones: arrayUnion(registroCancelacion),
          updatedAt: new Date()
        };

        // Si es cancelación total, cambiar estado
        if (esCancelacionTotal) {
          datosActualizacion.fechaCancelacion = formatYMD(new Date()),
          datosActualizacion.estado = 'cancelado';
        }
          // Actualizar solicitud
          transaction.update(solicitudRef, datosActualizacion);

          // Devolver saldo al empleado
          transaction.update(userDocRef, {
            'vacaciones.disponibles': saldoDespues,
            updatedAt: new Date()
          });
        });

      // Notificaciones según quién canceló
            try {
              const { sendNotification, userProfile } = useAuthStore.getState();
              const nombreSolicitante = (userProfile.nombre);
              
              if (esAdmin && solicitud.solicitante !== empleadoActual) {
                // Admin cancela solicitud de un empleado → Notificar al empleado
                await sendNotification({
                  empleadoEmail: solicitud.solicitante,
                  title: '⚠️ Cancelación de vacaciones',
                  body: `❌ El administrador ha cancelado ${formatearTiempoVacasLargo(horasADevolver)} de tus vacaciones. \n\n💬 Motivo: ${motivoCancelacion}`,
                  url: '/vacaciones/solicitudes',
                  type: 'vacaciones_cancelada'
                });
              } else if (!esAdmin) {
                // Caso 2: Trabajador cancela su propia solicitud → Notificar a admins
                await fetch('/.netlify/functions/notifyAdmins', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    solicitante: solicitud.solicitante,
                    nombreSolicitante: nombreSolicitante,
                    diasSolicitados: `${formatearTiempoVacasLargo(horasADevolver)}`,
                    esVenta: false,
                    accion: 'cancelacion_vacaciones',
                    mensaje: `❌ ${nombreSolicitante} ha cancelado ${formatearTiempoVacasLargo(horasADevolver)} de sus vacaciones. \n\n💬 Motivo: ${motivoCancelacion}`
                  })
                });
              }
            } catch (notifError) {
              console.error('Error enviando notificación:', notifError);
            }

            return {
              exito: true,
              esCancelacionTotal,
              horasDevueltas: horasADevolver,
              diasCancelados: diasACancelar.length,
              saldoAntes,                                           
              saldoDespues 
            };

          } catch (error) {
            console.error('Error en cancelación:', error);
            set({ error: error.message });
            throw error;
          }
        },

  // Obtener todos los empleados con sus saldos actuales
  obtenerEmpleadosConSaldos: async () => {
    try {
      const { isAdminOrOwner} = useAuthStore.getState();
      
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

      const userDocRef = doc(db, 'USUARIOS', empleadoEmail);
      let ajusteId;
      let saldoActual = { disponibles: 0, pendientes: 0 };
      let nuevoSaldo = { disponibles: 0, pendientes: 0 };

      // Usar transacción para actualizar saldo y crear solicitud de ajuste
      await runTransaction(db, async (transaction) => {
        // Obtener datos actuales del empleado
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error('Empleado no encontrado');
        }
        const datosEmpleado = userDoc.data();
        saldoActual = datosEmpleado.vacaciones || { disponibles: 0, pendientes: 0 };

        // Calcular nuevo saldo
        nuevoSaldo = { ...saldoActual };
        
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
            nuevoSaldo.disponibles = horas;
            break;
          default:
            throw new Error('Tipo de ajuste no válido');
        }

        // Validar que el nuevo saldo no sea negativo
        if (nuevoSaldo.disponibles < 0 ) {
          throw new Error('El ajuste resultaría en un saldo negativo');
        }

        // Actualizar saldo del empleado
        transaction.update(userDocRef, {
          'vacaciones': nuevoSaldo,
          updatedAt: new Date()
        });

        // Crear solicitud auto-aprobada para trazabilidad
        const newAjusteRef = doc(collection(db, 'VACACIONES'));
        ajusteId = newAjusteRef.id;

        const solicitudAjuste = {
          solicitante: empleadoEmail,
          fechas: [], // Sin fechas específicas
          fechasActuales: [], // Sin fechas específicas
          horasSolicitadas: Math.abs(horas),
          horasDisponiblesAntes: saldoActual.disponibles,
          horasDisponiblesDespues: nuevoSaldo.disponibles,
          fechaSolicitud: formatYMD(new Date()),
          estado: 'aprobada',
          fechaAprobacionDenegacion: formatYMD(new Date()),
          timestampAprobacionDenegacion: new Date(), 
          tipoSolicitud: 'ajuste_saldo',
          tipoAjuste: tipoAjuste,
          comentariosSolicitante: `Ajuste de saldo realizado por ${userProfile?.nombre || user?.email}`,
          comentariosAdmin: `${tipoAjuste.toUpperCase()} ${formatearTiempoVacasLargo(horas)}.\nRazón: ${razonAjuste.trim()}`,
          motivoAjuste: razonAjuste.trim(),
          realizadoPor: user?.email,
          esAjusteSaldo: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        transaction.set(newAjusteRef, solicitudAjuste);
      });
      // Notificar al empleado del ajuste de saldo
      try {
        const { sendNotification } = useAuthStore.getState();
        
        const emoji = tipoAjuste === 'añadir' ? '📈' : tipoAjuste === 'reducir' ? '📉' : '🔄';
        
        await sendNotification({
          empleadoEmail: empleadoEmail,
          title: `${emoji} Ajuste de saldo de vacaciones`,
          body: tipoAjuste === 'añadir' 
            ? `Se han añadido ${formatearTiempoVacasLargo(horas)} a tu saldo.\nSaldo actual: ${formatearTiempoVacasLargo(nuevoSaldo.disponibles)}\n${razonAjuste.trim()}`
            : tipoAjuste === 'reducir' 
              ? `Se han reducido ${formatearTiempoVacasLargo(horas)} de tu saldo.\nSaldo actual: ${formatearTiempoVacasLargo(nuevoSaldo.disponibles)}\n${razonAjuste.trim()}`
               : `Se ha ajustado tu saldo a ${formatearTiempoVacasLargo(horas)}`,
          url: '/vacaciones/solicitudes',
          type: 'ajuste_saldo'
        });
      } catch (notifError) {
        console.error('Error enviando notificación:', notifError);
      }


      return {
        exito: true,
        ajusteId,
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


  // Ajustar saldos masivamente con batch para atomicidad
ajustarSaldosMasivo: async (empleadosSeleccionados, tipoAjuste, horas, razonAjuste) => {
  try {
    const { user, userProfile } = useAuthStore.getState();
    
    if (!razonAjuste || razonAjuste.trim() === '') {
      throw new Error('Debes especificar una razón para el ajuste masivo');
    }

    if (!empleadosSeleccionados || empleadosSeleccionados.length === 0) {
      throw new Error('Debes seleccionar al menos un empleado');
    }

    // Paso 1: Leer todos los documentos de usuarios en paralelo
    const userRefs = empleadosSeleccionados.map(email => doc(db, 'USUARIOS', email));
    const userSnaps = await Promise.all(userRefs.map(ref => getDoc(ref)));
    
    const empleadosData = userSnaps.map((snap, index) => {
      if (!snap.exists()) {
        throw new Error(`Empleado no encontrado: ${empleadosSeleccionados[index]}`);
      }
      return { email: empleadosSeleccionados[index], data: snap.data() };
    });

    // Paso 2: Validar y calcular nuevos saldos para todos (antes de batch)
    const nuevosSaldos = empleadosData.map(({ email, data }) => {
      const saldoActual = data.vacaciones || { disponibles: 0, pendientes: 0 };
      let nuevoSaldo = { ...saldoActual };
      
      switch (tipoAjuste) {
        case 'añadir':
          nuevoSaldo.disponibles += horas;
          break;
        case 'reducir':
          if (saldoActual.disponibles < horas) {
            throw new Error(`No se pueden reducir ${horas}h para ${email}. Saldo disponible: ${saldoActual.disponibles}h`);
          }
          nuevoSaldo.disponibles -= horas;
          break;
        case 'establecer':
          nuevoSaldo.disponibles = horas;
          break;
        default:
          throw new Error('Tipo de ajuste no válido');
      }

      if (nuevoSaldo.disponibles < 0) {
        throw new Error(`El ajuste resultaría en saldo negativo para ${email}`);
      }

      return { email, saldoActual, nuevoSaldo };
    });

    // Paso 3: Crear batch si todas las validaciones pasan
    const batch = writeBatch(db);
    const resultados = [];

    nuevosSaldos.forEach(({ email, saldoActual, nuevoSaldo }) => {
      const userDocRef = doc(db, 'USUARIOS', email);
      batch.update(userDocRef, {
        'vacaciones': nuevoSaldo,
        updatedAt: new Date()
      });

      // Crear solicitud de ajuste para trazabilidad
      const newAjusteRef = doc(collection(db, 'VACACIONES'));
      const ajusteId = newAjusteRef.id; // Para incluir en resultados

      const solicitudAjuste = {
        solicitante: email,
        fechas: [],
        fechasActuales: [],
        horasSolicitadas: Math.abs(horas),
        horasDisponiblesAntes: saldoActual.disponibles,
        horasDisponiblesDespues: nuevoSaldo.disponibles,
        fechaSolicitud: formatYMD(new Date()),
        estado: 'aprobada',
        fechaAprobacionDenegacion: formatYMD(new Date()),
        timestampAprobacionDenegacion: new Date(), 
        tipoSolicitud: 'ajuste_saldo',
        tipoAjuste: tipoAjuste,
        comentariosSolicitante: `Ajuste de saldo realizado por ${userProfile?.nombre || user?.email}`,
        comentariosAdmin: `${tipoAjuste.toUpperCase()} ${formatearTiempoVacasLargo(horas)}.\nRazón: ${razonAjuste.trim()}`,
        motivoAjuste: razonAjuste.trim(),
        realizadoPor: user?.email,
        esAjusteSaldo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      batch.set(newAjusteRef, solicitudAjuste);

      resultados.push({
        empleado: email,
        exito: true,
        ajusteId,
        saldoAnterior: saldoActual,
        saldoNuevo: nuevoSaldo,
        horasAjustadas: horas,
        tipoAjuste: tipoAjuste
      });
    });

    // Paso 4: Cometer el batch (atómico: todo o nada)
    await batch.commit();

    // Paso 5: Enviar notificaciones a todos los empleados (en paralelo)
    try {
      const { sendNotification } = useAuthStore.getState();
      const emoji = tipoAjuste === 'añadir' ? '📈' : tipoAjuste === 'reducir' ? '📉' : '🔄';
      
      const notificacionesPromises = resultados.map(({ empleado, saldoNuevo }) => {
        let body;
        
        if (tipoAjuste === 'añadir') {
          body = `Se han añadido ${formatearTiempoVacasLargo(horas)} a tu saldo.\nSaldo actual: ${formatearTiempoVacasLargo(saldoNuevo.disponibles)}\n${razonAjuste.trim()}`;
        } else if (tipoAjuste === 'reducir') {
          body = `Se han reducido ${formatearTiempoVacasLargo(horas)} de tu saldo.\nSaldo actual: ${formatearTiempoVacasLargo(saldoNuevo.disponibles)}\n${razonAjuste.trim()}`;
        } else {
          body = `Se ha ajustado tu saldo a ${formatearTiempoVacasLargo(horas)}.\n${razonAjuste.trim()}`;
        }
        
        return sendNotification({
          empleadoEmail: empleado,
          title: `${emoji} Ajuste de saldo de vacaciones`,
          body: body,
          url: '/vacaciones/solicitudes',
          type: 'ajuste_saldo'
        }).catch(error => {
          console.error(`Error enviando notificación a ${empleado}:`, error);
          // No lanzar error para que no afecte al resto
          return null;
        });
      });

      await Promise.all(notificacionesPromises);
      console.log(`Notificaciones enviadas a ${resultados.length} empleados`);
      
    } catch (notifError) {
      console.error('Error enviando notificaciones masivas:', notifError);
      // Las notificaciones son secundarias, no afectan el resultado principal
    }

    return {
      procesados: resultados.length,
      errores: [],
      total: empleadosSeleccionados.length,
      exito: true,
      resultados
    };

  } catch (error) {
    console.error('Error en ajuste masivo:', error);
    set({ error: error.message });
    return {
      procesados: 0,
      errores: [error.message],
      total: empleadosSeleccionados.length,
      exito: false,
      resultados: []
    };
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

      const emails = [...new Set([
        ...ajustes.map(a => a.solicitante),
        ...ajustes.map(a => a.realizadoPor)
      ].filter(Boolean))];

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
        if (solicitud.fechasActuales && solicitud.fechasActuales.length > 0) {
          solicitud.fechasActuales.forEach(fecha => {
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

    loadHistorialSolicitudesConCancelaciones: async (filtros = {}) => {
      try {
        const { isAdminOrOwner } = useAuthStore.getState();
        if (!isAdminOrOwner()) {
          throw new Error('Sin permisos para acceder al historial completo');
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

        // ✅ CARGAR cada solicitud con sus cancelaciones parciales
        let solicitudes = querySnapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
            }));

        // Filtros adicionales en memoria
        let solicitudesFiltradas = solicitudes;

        if (filtros.empleado) {
          solicitudesFiltradas = solicitudesFiltradas.filter(s => s.solicitante === filtros.empleado);
        }

        if (filtros.año) {
          solicitudesFiltradas = solicitudesFiltradas.filter(s => {
            const añoSolicitud = new Date(s.fechaSolicitud).getFullYear();
            const añoPrimeraFecha = s.fechasActuales && s.fechasActuales.length > 0 ?
              new Date(s.fechasActuales[0]).getFullYear() : añoSolicitud;
            return añoSolicitud === filtros.año || añoPrimeraFecha === filtros.año;
          });
        }

        return solicitudesFiltradas;
      } catch (error) {
        console.error('Error cargando historial con cancelaciones:', error);
        set({ error: error.message });
        return [];
      }
    },

    
mapSolicitudToEventos: (solicitud) => {
  // Todas las fechas vienen como "YYYY-MM-DD"
  const eventos = [];
  const rank = { ajuste: 0, aprobacion: 1, cancelacion_parcial: 2, cancelacion_total: 3, denegada: 4 };

  // Ajustes de saldo
  if (solicitud.esAjusteSaldo) {
    const fecha = solicitud.fechaAprobacionDenegacion || solicitud.fechaSolicitud;
    eventos.push({
      tipo: 'ajuste',
      tipoAjuste: solicitud.tipoAjuste, // 'añadir' | 'reducir' | 'establecer'
      fecha,
      timestamp: solicitud.timestampAprobacionDenegacion, 
      deltaHoras: (solicitud.horasDisponiblesDespues ?? 0) - (solicitud.horasDisponiblesAntes ?? 0),
      saldoAntes: solicitud.horasDisponiblesAntes ?? null,
      saldoDespues: solicitud.horasDisponiblesDespues ?? null,
      concepto: `Ajuste: ${solicitud.tipoAjuste}`,
      solicitudId: solicitud.id,
      ordenDia: rank.ajuste,
      comentariosSolicitante:solicitud.comentariosSolicitante,
      comentariosAdmin:solicitud.comentariosAdmin
    });
  }

  // Aprobación (resta saldo disponible)
  if ( !solicitud.esAjusteSaldo && ['aprobada','cancelado'].includes(solicitud.estado) && solicitud.fechaAprobacionDenegacion) {
    eventos.push({
      tipo: 'aprobacion',
      fecha: solicitud.fechaAprobacionDenegacion,
      timestamp: solicitud.timestampAprobacionDenegacion,
      deltaHoras: (solicitud.horasDisponiblesDespues ?? 0) - (solicitud.horasDisponiblesAntes ?? 0), // suele ser negativo
      saldoAntes: solicitud.horasDisponiblesAntes ?? null,
      saldoDespues: solicitud.horasDisponiblesDespues ?? null,
      concepto: solicitud.esVenta ? 'Venta Aprobada' : 'Solicitud aprobada',
      esVenta: solicitud.esVenta || false,
      cantidadARecibir:solicitud?.cantidadARecibir,
      solicitudId: solicitud.id,
      ordenDia: rank.aprobacion,
      horasSolicitadas: solicitud.horasSolicitadas,
      fechasSolicitadas: solicitud.fechasSeleccionadas || solicitud.fechas || null,
      comentariosAdmin: solicitud.comentariosAdmin || null,
      comentariosSolicitante: solicitud.comentariosSolicitante || null 
    });
  }

  // Cancelaciones parciales (suman)
  if (Array.isArray(solicitud.cancelaciones)) {
    for (const c of solicitud.cancelaciones) {
      if (c.esCancelacionTotal === true) {
      continue; 
    }
      eventos.push({
        tipo: 'cancelacion_parcial',
        fecha: c.fechaCancelacion,
        timestamp: c.createdAt,
        deltaHoras: (c.horasDisponiblesDespuesCancelacion ?? 0) - (c.horasDisponiblesAntesCancelacion ?? 0), // positivo
        saldoAntes: c.horasDisponiblesAntesCancelacion ?? null,
        saldoDespues: c.horasDisponiblesDespuesCancelacion ?? null,
        concepto: `Cancelación parcial`,
        horasDevueltas:c.horasDevueltas,
        procesadaPor: c.procesadaPor,
        solicitudId: solicitud.id,
        ordenDia: rank.cancelacion_parcial,
        fechasCanceladas: c.fechasCanceladas || [],
        motivoCancelacion: c.motivoCancelacion || null    
      });
    }
  }

  // Cancelación total (suma)
  if (solicitud.estado === 'cancelado' && Array.isArray(solicitud.cancelaciones)) {
    const registroCancelacionTotal = solicitud.cancelaciones[solicitud.cancelaciones.length - 1];
    eventos.push({
      tipo: 'cancelacion_total',
      fecha: registroCancelacionTotal.fechaCancelacion,
      timestamp: registroCancelacionTotal.createdAt,
      deltaHoras: (registroCancelacionTotal.horasDisponiblesDespuesCancelacion ?? 0) - (registroCancelacionTotal.horasDisponiblesAntesCancelacion ?? 0), // positivo
      saldoAntes: registroCancelacionTotal.horasDisponiblesAntesCancelacion ?? null,
      saldoDespues: registroCancelacionTotal.horasDisponiblesDespuesCancelacion ?? null,
      concepto: 'Cancelación total',
      esVenta: solicitud?.esVenta,
      esHorasSueltas:registroCancelacionTotal.horasDevueltas<8,
      horasDevueltas:registroCancelacionTotal.horasDevueltas,
      procesadaPor: registroCancelacionTotal.procesadaPor,
      solicitudId: solicitud.id,
      ordenDia: rank.cancelacion_total,
      motivoCancelacion: registroCancelacionTotal.motivoCancelacion || null,
      fechasCanceladas: registroCancelacionTotal.fechasCanceladas || null
    });
  }

  // Ampliaciones (restan)
  if (Array.isArray(solicitud.ampliaciones)) {
    solicitud.ampliaciones.forEach(ampliacion => {
      eventos.push({
        tipo: 'ampliacion',
        fecha: ampliacion.fechaAmpliacion,
        timestamp: ampliacion.createdAt,
        deltaHoras: (ampliacion.horasDisponiblesDespuesAmpliacion ?? 0) - (ampliacion.horasDisponiblesAntesAmpliacion ?? 0), // suele ser negativo
        solicitudId: solicitud.id,
        solicitante: solicitud.solicitante,
        horasAmpliadas: ampliacion.horasAmpliadas,
        saldoAntes: ampliacion.horasDisponiblesAntesAmpliacion,
        saldoDespues: ampliacion.horasDisponiblesDespuesAmpliacion,
        concepto: 'Ampliacion de días',
        procesadaPor: ampliacion.procesadaPor,
        fechasAmpliadas: ampliacion.fechasAmpliadas || [],
        motivoAmpliacion: ampliacion.motivoAmpliacion,
        ordenDia: rank.ampliacion,
      });
    });
  }

  // Denegada (0)
  if (solicitud.estado === 'denegada' && solicitud.fechaAprobacionDenegacion) {
    eventos.push({
      tipo: 'denegada',
      fecha: solicitud.fechaAprobacionDenegacion,
      timestamp: solicitud.timestampAprobacionDenegacion,
      deltaHoras: 0,
      saldoAntes: solicitud.horasDisponiblesAntes ?? null,
      saldoDespues: solicitud.horasDisponiblesDespues ?? null,
      concepto: solicitud.esVenta? 'Venta Denegada' : 'Solicitud denegada',
      solicitudId: solicitud.id,
      esVenta: solicitud.esVenta || false,
      horasSolicitadas: solicitud.horasSolicitadas,
      ordenDia: rank.denegada,
      fechasSolicitadas: solicitud.fechasSeleccionadas || solicitud.fechas || null,
      comentariosAdmin: solicitud.comentariosAdmin || null,
      comentariosSolicitante: solicitud.comentariosSolicitante || null  
    });
  }

  return eventos;
},

getEventosSaldoUsuarioPeriodo: async (usuarioEmail, inicioYMD, finYMD) => {
  const { mapSolicitudToEventos, ordenarEventosPorDiaCadena } = get();
  
  // 1. Consultar directamente desde Firestore
  const solicitudesQuery = query(
    collection(db, 'VACACIONES'),
    where('solicitante', '==', usuarioEmail),
    orderBy('fechaSolicitud', 'desc')
  );
  
  const querySnapshot = await getDocs(solicitudesQuery);
  const solicitudesUsuario = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // 2. Aplanar a eventos
  const todosEventos = solicitudesUsuario.flatMap(s => mapSolicitudToEventos(s));
  
  // 3. Filtrar por periodo [inicioYMD, finYMD]
  const enRango = todosEventos.filter(e => e.fecha >= inicioYMD && e.fecha <= finYMD);
  
  // 4. Ordenar por fecha y timestamp (más reciente primero)
  const eventosOrdenados = ordenarEventosPorDiaCadena(enRango);
  
  // 5. El saldo inicial es el saldoAntes del primer evento (más antiguo)
  const saldoInicial = eventosOrdenados.length > 0 
    ? (eventosOrdenados[0]?.saldoAntes || 0)
    : 0;
  
  // 6. Devolver eventos ordenados y saldo inicial
  return { 
    eventos: eventosOrdenados, 
    saldoInicial 
  };
},


ordenarEventosPorDiaCadena: (eventos) => {
  if (!Array.isArray(eventos) || eventos.length === 0) return [];

  // Ordenar primero por fecha, luego por timestamp si existe
  return eventos.sort((b, a) => {
    // Comparar por fecha string
    const fechaComparison = (b.fecha || '').localeCompare(a.fecha || '');
    
    if (fechaComparison !== 0) {
      return fechaComparison; // Fechas diferentes, ordenar por fecha
    }

    // Misma fecha: ordenar por timestamp si ambos lo tienen
    const timestampA = a.timestamp?.toMillis?.() || a.timestamp?.getTime?.() || 0;
    const timestampB = b.timestamp?.toMillis?.() || b.timestamp?.getTime?.() || 0;
      return timestampB - timestampA; // Más reciente ultimo
    }
  )
},


    // Calcular días laborables de un año (lunes a viernes menos festivos)
calcularDiasLaborables: (año, todosLosFestivos) => {
  // Filtrar solo los festivos del año específico
  const festivosDelAño = todosLosFestivos.filter(f => {
    // Las fechas vienen como "YYYY-MM-DD"
    return f.fecha && f.fecha.startsWith(año.toString());
  });
  
  // Convertir festivos a Set de cadenas para búsqueda rápida
  const fechasFestivasSet = new Set(festivosDelAño.map(f => f.fecha));
  
  let count = 0;
  
  // Fechas de inicio y fin del año
  const startDate = new Date(año, 0, 1); // 1 de enero
  const endDate = new Date(año, 11, 31); // 31 de diciembre
  const curDate = new Date(startDate);
  
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    
    // Si NO es sábado (6) ni domingo (0)
    if (!((dayOfWeek === 6) || (dayOfWeek === 0))) {
      // Convertir curDate a formato "YYYY-MM-DD" para comparar
      const año = curDate.getFullYear();
      const mes = String(curDate.getMonth() + 1).padStart(2, '0');
      const dia = String(curDate.getDate()).padStart(2, '0');
      const fechaStr = `${año}-${mes}-${dia}`;
      
      // Si NO es festivo, contar
      if (!fechasFestivasSet.has(fechaStr)) {
        count++;
      }
    }
    
    curDate.setDate(curDate.getDate() + 1);
  }
  
  return count;
},


  // Obtener cálculo de exceso de jornada de un año
  obtenerCalculoExcesoJornada: async (año) => {
    try {
      const docRef = doc(db, 'EXCESO_JORNADA', año.toString());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo cálculo de exceso de jornada:', error);
      throw error;
    }
  },

  // Guardar cálculo de exceso de jornada
  guardarCalculoExcesoJornada: async (año, datos) => {
    try {
      const docRef = doc(db, 'EXCESO_JORNADA', año.toString());
      
      await setDoc(docRef, {
        ...datos,
        fechaCalculo: new Date(),
        calculadoPor: useAuthStore.getState().user?.email || 'system'
      });
      
      return true;
    } catch (error) {
      console.error('Error guardando cálculo de exceso de jornada:', error);
      set({ error: error.message });
      throw error;
    }
  },

  obtenerDiasAmpliados: (ampliaciones) => {
    if (!Array.isArray(ampliaciones)) return [];
    return ampliaciones.reduce((acc, ampliacion) => {
      return [...acc, ...(ampliacion.fechasAmpliadas || [])];
    }, []);
  },

  // Añadir días a una solicitud de vacaciones existente (SOLO ADMIN)
  añadirDiasVacaciones: async (solicitudId, nuevasFechas, motivoAmpliacion, solicitudOriginal, esAdmin) => {
    try {
      const { userProfile } = useAuthStore.getState();

      // Validar que es admin
      if (!esAdmin) {
        throw new Error('Solo los administradores pueden ampliar vacaciones');
      }

      // Validar que haya nuevas fechas
      if (!nuevasFechas || nuevasFechas.length === 0) {
        throw new Error('Debes añadir al menos una fecha nueva');
      }

      // Validar que no sea una venta
      if (solicitudOriginal.esVenta||solicitudOriginal.esAjusteSaldo) {
        throw new Error('No se pueden ampliar Ajustes de Saldo ni solicitudes de venta de vacaciones');
      }

      // Combinar fechasActuales con las nuevas (sin duplicados, ordenadas)
      const fechasActualizadas = [...new Set([...solicitudOriginal.fechasActuales, ...nuevasFechas])].sort();
      
      // Calcular horas ampliadas
      const horasAmpliadas = nuevasFechas.length * 8;

      const solicitudRef = doc(db, 'VACACIONES', solicitudId);
      const userDocRef = doc(db, 'USUARIOS', solicitudOriginal.solicitante);

      // Transacción atómica para actualizar solicitud y saldo
      await runTransaction(db, async (transaction) => {
        // Leer saldo actual del empleado
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error('Usuario no encontrado');
        }

        const currentVacaciones = userDoc.data().vacaciones || { disponibles: 0, pendientes: 0 };

        // Validar que tenga saldo suficiente
        if (currentVacaciones.disponibles < horasAmpliadas) {
          throw new Error(`El empleado no tiene suficiente saldo. Disponible: ${formatearTiempoVacasLargo(currentVacaciones.disponibles)}, necesario: ${formatearTiempoVacasLargo(horasAmpliadas)}`);
        }

        // Crear registro de ampliación
        const nuevaAmpliacion = {
          createdAt: new Date(),
          fechaAmpliacion: formatYMD(new Date()),
          fechasAmpliadas: nuevasFechas,
          horasAmpliadas: horasAmpliadas,
          motivoAmpliacion: motivoAmpliacion || '',
          procesadaPor: userProfile?.nombre || 'admin',
          horasDisponiblesAntesAmpliacion: currentVacaciones.disponibles,
          horasDisponiblesDespuesAmpliacion: currentVacaciones.disponibles - horasAmpliadas
        };

        // Actualizar solicitud
        transaction.update(solicitudRef, {
          fechasActuales: fechasActualizadas,
          ampliaciones: arrayUnion(nuevaAmpliacion),
          updatedAt: new Date()
        });

        // Descontar horas del saldo disponible
        transaction.update(userDocRef, {
          'vacaciones.disponibles': currentVacaciones.disponibles - horasAmpliadas,
          updatedAt: new Date()
        });
      });

      // Notificar al empleado
      try {
        const { sendNotification } = useAuthStore.getState();
        await sendNotification({
          empleadoEmail: solicitudOriginal.solicitante,
          title: '📝 Vacaciones ampliadas por administración',
          body: `Se añadieron ${formatearTiempoVacasLargo(horasAmpliadas)} a tu solicitud de vacaciones`,
          url: '/vacaciones/solicitudes',
          type: 'vacaciones_ampliadas_admin'
        });
      } catch (notifError) {
        console.error('Error enviando notificación:', notifError);
      }

      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Calcular estado real de cada fecha considerando ampliaciones y cancelaciones
  calcularEstadoRealFechasVacaciones: (solicitud) => {
    if (!solicitud.fechas) return { activas: [], canceladas: [], ampliadas: [] };

    // Crear un registro temporal con todas las fechas originales
    const registroFechas = {};
    solicitud.fechas.forEach(fecha => {
      registroFechas[fecha] = {
        estado: 'original',
        ultimaAccion: solicitud.fechaSolicitud || '1970-01-01',
        accionTipo: 'solicitud'
      };
    });

    // Crear un array con TODAS las acciones (ampliaciones y cancelaciones) ordenadas cronológicamente
    const todasLasAcciones = [];

    // Añadir ampliaciones
    if (solicitud.ampliaciones && solicitud.ampliaciones.length > 0) {
      solicitud.ampliaciones.forEach(ampliacion => {
        todasLasAcciones.push({
          tipo: 'ampliacion',
          fecha: ampliacion.fechaAmpliacion,
          fechasAfectadas: ampliacion.fechasAmpliadas
        });
      });
    }

    // Añadir cancelaciones
    if (solicitud.cancelaciones && solicitud.cancelaciones.length > 0) {
      solicitud.cancelaciones.forEach(cancelacion => {
        todasLasAcciones.push({
          tipo: 'cancelacion',
          fecha: cancelacion.fechaCancelacion,
          fechasAfectadas: cancelacion.fechasCanceladas
        });
      });
    }

    // Ordenar TODAS las acciones cronológicamente
    todasLasAcciones.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Procesar las acciones en orden cronológico
    todasLasAcciones.forEach(accion => {
      accion.fechasAfectadas.forEach(fecha => {
        if (accion.tipo === 'ampliacion') {
          // AÑADIR fecha
          if (!registroFechas[fecha]) {
            // Fecha completamente nueva
            registroFechas[fecha] = {
              estado: 'ampliada',
              ultimaAccion: accion.fecha,
              accionTipo: 'ampliacion'
            };
          } else if (registroFechas[fecha].estado === 'cancelada') {
            // Reactivar fecha previamente cancelada
            registroFechas[fecha] = {
              estado: 'reactivada',
              ultimaAccion: accion.fecha,
              accionTipo: 'ampliacion'
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
    const ampliadas = [];

    Object.entries(registroFechas).forEach(([fecha, info]) => {
      if (info.estado === 'cancelada') {
        canceladas.push(fecha);
      } else if (info.estado === 'ampliada') {
        ampliadas.push(fecha);
      } else if (info.estado === 'reactivada' || info.estado === 'original') {
        activas.push(fecha);
      }
    });

    return { activas, canceladas, ampliadas };
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
