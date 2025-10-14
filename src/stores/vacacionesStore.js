// stores/vacacionesStore.js
import { create } from 'zustand';
import { arrayUnion, collection, onSnapshot, doc, updateDoc, writeBatch, query, where, orderBy, getDoc, getDocs, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthStore } from './authStore';
import { formatYMD, esFinDeSemana, esFechaPasadaOHoy} from '../utils/dateUtils';
import { formatearNombre } from '../components/Helpers';
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
    const { user } = useAuthStore.getState(); // Only for metadata if needed; don't use userProfile for saldo

    // Evaluar auto-aprobación ANTES de crear (usa datos locales para evaluación)
    const solicitudTemp = { // Objeto temporal para evaluación
      ...solicitudData,
      id: 'temp', // ID placeholder
      estado: 'pendiente',
      fechaSolicitud: formatYMD(new Date()),
    };
    const res = await get().evaluarAutoAprobacion(solicitudTemp);

    const nuevaSolicitud = {
      ...solicitudData,
      fechaSolicitud: formatYMD(new Date()),
      estado: res.aplicar ? 'aprobada' : 'pendiente',
      comentariosAdmin: res.aplicar ? (get().configVacaciones?.autoAprobar?.mensaje || 'Aprobado automáticamente por política activa.') : '',
      fechaAprobacionDenegacion: res.aplicar ? formatYMD(new Date()) : '',
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
        if (res.aplicar) {
          // ✅ Auto-aprobada: Notificar al solicitante
          const { sendNotification, userProfile } = useAuthStore.getState();
          const nombreSolicitante = formatearNombre(userProfile?.nombre || solicitudData.solicitante);
  
          await sendNotification({
            empleadoEmail: nombreSolicitante,
            title: '✅ Solicitud de vacaciones aprobada',
            body: solicitudData.esVenta 
              ? `Tu venta de ${formatearTiempoVacasLargo(solicitudData.horasSolicitadas)} ha sido aprobada automáticamente`
              : `Tu solicitud de ${formatearTiempoVacasLargo(solicitudData.horasSolicitadas)} ha sido aprobada automáticamente`,
            url: '/vacaciones/solicitudes',
            type: 'vacaciones_aprobada'
          });
        } else {
          // solicitud en estado endiente: Notificar a admins via Cloud Function
          const { userProfile } = useAuthStore.getState();
          const nombreSolicitante = formatearNombre(userProfile?.nombre || solicitudData.solicitante);

          await fetch('/.netlify/functions/notifyAdmins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
        // No bloquear la creación de la solicitud
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

        // Cancelar Solicitudes de Vacaciones
        cancelarSolicitudVacaciones: async (solicitud, motivoCancelacion, esAdmin = false) => {
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
          const horasYaCanceladas = diasYaCancelados.length * 8;
          horasADevolver = solicitud.horasSolicitadas - horasYaCanceladas;
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

        return true;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

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
          updatedAt: new Date(),
          estado: resAuto.aplicar ? 'aprobada' : 'pendiente',
          comentariosAdmin: resAuto.aplicar ? (get().configVacaciones?.autoAprobar?.mensaje || 'Aprobado automáticamente por política activa.') : '',
          fechaAprobacionDenegacion: resAuto.aplicar ? formatYMD(new Date()) : '',
          horasDisponiblesAntes: '', // Se calculará en transacción si aplica
          horasDisponiblesDespues: '' // Se calculará en transacción si aplica
        };

        // Si original era aprobada, limpiar campos de aprobación (incluso si se auto-aprueba de nuevo)
        if (solicitudOriginal.estado === 'aprobada' && !resAuto.aplicar) {
          datosFinales.comentariosAdmin = ''; 
          datosFinales.horasDisponiblesAntes = '';
          datosFinales.horasDisponiblesDespues = '';
          datosFinales.fechaAprobacionDenegacion = '';
        }

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

    getFechasVivasDeSolicitud:(solicitud)=> {
  const fechasSolicitadas = Array.isArray(solicitud?.fechas) ? [...new Set(solicitud.fechas)] : [];

  const parciales = Array.isArray(solicitud?.cancelacionesParciales)
    ? solicitud.cancelacionesParciales.flatMap(c => Array.isArray(c.fechasCanceladas) ? c.fechasCanceladas : [])
    : [];

  // Si hubo cancelación total, la solicitud suele guardar 'fechasCanceladas'
  // Fallback: si estado === 'cancelado' y no hay 'fechasCanceladas', considerar todo cancelado
  const totales = Array.isArray(solicitud?.fechasCanceladas)
    ? solicitud.fechasCanceladas
    : (solicitud?.estado === 'cancelado' ? fechasSolicitadas : []);

  const canceladasSet = new Set([...parciales, ...totales]);

  return fechasSolicitadas.filter(f => !canceladasSet.has(f)).sort();
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
            updateData.horasDisponiblesAlDenegar = saldoAntes.disponibles;
          }

          // Actualizar solicitud
          transaction.update(solicitudRef, updateData);

          // Actualizar saldo del usuario
          transaction.update(userDocRef, {
            'vacaciones': saldoDespues,
            updatedAt: new Date()
          });
      

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
    })

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
          return solicitud.estado === 'pendiente' && esFechaPasadaOHoy(primeraFecha) && !solicitud.esVenta;
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
        const solicitudesEnFecha = solicitudesAprobadas.filter(s => {
          if (!Array.isArray(s.fechas) || !s.fechas.includes(fecha)) return false;
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
          const {loadConfigVacaciones, configVacaciones, detectarConflictos } = get();
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
                  (solicitud.fechas || []).map(f => get().detectarConflictos(f))
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
          return solicitud.fechas.some(fecha => {
            const fechaAño = new Date(fecha).getFullYear();
            return fechaAño === año;
          });
        });
        
        const base=solicitudesFiltradas.sort((a, b) => new Date(a.fechas[0]) - new Date(b.fechas[0]));
        const result = [];
        for (const s of base) {
        const diasCancelados = get().obtenerDiasCancelados(s.cancelacionesParciales);
        result.push({
          ...s,
          _diasCanceladosSet: new Set(diasCancelados),
        });
      }
      return result;
        
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

      const cancelacionesPrevias = solicitud.cancelacionesParciales || [];
      const diasYaCancelados = get().obtenerDiasCancelados(cancelacionesPrevias);

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
      const empleadoActual = esAdmin ? solicitud.solicitante : user?.email;
      const userDocRef = doc(db, 'USUARIOS', empleadoActual);

      // Usar transacción para crear cancelación parcial y actualizar saldo
      let cancelacionId;
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



        const cancelacionData = {
          id: doc(collection(db, 'temp')).id, // generar ID único client-side
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
        cancelacionId = cancelacionData.id;

        // Actualizar la solicitud con arrayUnion
        const solicitudRef = doc(db, 'VACACIONES', solicitud.id);
        transaction.update(solicitudRef, {
          cancelacionesParciales: arrayUnion(cancelacionData),
          updatedAt: new Date()
        });

        //  ACTUALIZAR saldo del empleado
        transaction.update(userDocRef, {
          'vacaciones.disponibles': saldoDespues,
          updatedAt: new Date()
        });
      });

      return {
        exito: true,
        cancelacionId,
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
      const { isAdminOrOwner, isLeaveAdmin } = useAuthStore.getState();
      
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
          horasSolicitadas: Math.abs(horas),
          horasDisponiblesAntes: saldoActual.disponibles,
          horasDisponiblesDespues: nuevoSaldo.disponibles,
          fechaSolicitud: formatYMD(new Date()),
          estado: 'aprobada',
          fechaAprobacionDenegacion: formatYMD(new Date()),
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
        horasSolicitadas: Math.abs(horas),
        horasDisponiblesAntes: saldoActual.disponibles,
        horasDisponiblesDespues: nuevoSaldo.disponibles,
        fechaSolicitud: formatYMD(new Date()),
        estado: 'aprobada',
        fechaAprobacionDenegacion: formatYMD(new Date()),
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
      //
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
            const añoPrimeraFecha = s.fechas && s.fechas.length > 0 ?
              new Date(s.fechas[0]).getFullYear() : añoSolicitud;
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

  // Ajustes de saldo (auto-aprobados para trazabilidad)
  if (solicitud.esAjusteSaldo) {
    const fecha = solicitud.fechaAprobacionDenegacion || solicitud.fechaSolicitud;
    eventos.push({
      tipo: 'ajuste',
      tipoAjuste: solicitud.tipoAjuste, // 'añadir' | 'reducir' | 'establecer'
      fecha,
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
      deltaHoras: (solicitud.horasDisponiblesDespues ?? 0) - (solicitud.horasDisponiblesAntes ?? 0), // suele ser negativo
      saldoAntes: solicitud.horasDisponiblesAntes ?? null,
      saldoDespues: solicitud.horasDisponiblesDespues ?? null,
      concepto: solicitud.esVenta ? 'Venta Aprobada' : 'Solicitud aprobada',
      esVenta: solicitud.esVenta || false,
      solicitudId: solicitud.id,
      ordenDia: rank.aprobacion,
      horasSolicitadas: solicitud.horasSolicitadas,
      fechasSolicitadas: solicitud.fechasSeleccionadas || solicitud.fechas || null,
      comentariosAdmin: solicitud.comentariosAdmin || null,
      comentariosSolicitante: solicitud.comentariosSolicitante || null 
    });
  }

  // Cancelaciones parciales (suman)
  if (Array.isArray(solicitud.cancelacionesParciales)) {
    for (const c of solicitud.cancelacionesParciales) {
      eventos.push({
        tipo: 'cancelacion_parcial',
        fecha: c.fechaCancelacion,
        deltaHoras: (c.horasDisponiblesDespuesCancelacion ?? 0) - (c.horasDisponiblesAntesCancelacion ?? 0), // positivo
        saldoAntes: c.horasDisponiblesAntesCancelacion ?? null,
        saldoDespues: c.horasDisponiblesDespuesCancelacion ?? null,
        concepto: `Cancelación parcial`,
        solicitudId: solicitud.id,
        ordenDia: rank.cancelacion_parcial,
        fechasCanceladas: c.fechasCanceladas || [],
        motivoCancelacion: c.motivoCancelacion || null    
      });
    }
  }

  // Cancelación total (suma)
  if (solicitud.estado === 'cancelado' && solicitud.fechaCancelacion) {
    eventos.push({
      tipo: 'cancelacion_total',
      fecha: solicitud.fechaCancelacion,
      deltaHoras: (solicitud.horasDisponiblesDespuesCancelacion ?? 0) - (solicitud.horasDisponiblesAntesCancelacion ?? 0), // positivo
      saldoAntes: solicitud.horasDisponiblesAntesCancelacion ?? null,
      saldoDespues: solicitud.horasDisponiblesDespuesCancelacion ?? null,
      concepto: 'Cancelación total',
      solicitudId: solicitud.id,
      ordenDia: rank.cancelacion_total,
      motivoCancelacion: solicitud.motivoCancelacion || null,
      fechasCanceladas: solicitud.fechasCanceladas || null
    });
  }

  // Denegada (0)
  if (solicitud.estado === 'denegada' && solicitud.fechaAprobacionDenegacion) {
    eventos.push({
      tipo: 'denegada',
      fecha: solicitud.fechaAprobacionDenegacion,
      deltaHoras: 0,
      saldoAntes: solicitud.horasDisponiblesAlDenegar ?? null,
      saldoDespues: solicitud.horasDisponiblesAlDenegar ?? null,
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
  
  // 1. Consultar directamente desde Firestore en lugar de memoria
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
  
  // 2) Aplanar a eventos
  const todosEventos = solicitudesUsuario.flatMap(s => mapSolicitudToEventos(s));
  
  // 3) Filtrar por periodo [inicioYMD, finYMD]
  const enRango = todosEventos.filter(e => e.fecha >= inicioYMD && e.fecha <= finYMD);
  
  // 4) Ordenar por fecha y por cadena de saldos
  const { eventosOrdenados, saldoInicial } = ordenarEventosPorDiaCadena(enRango, null);
  
  // 5) Devolver
  return { eventos: eventosOrdenados, saldoInicial };
  },

// Orden estable por día encadenando saldoAntes -> saldoDespues
ordenarEventosPorDiaCadena: (eventos, saldoInicialPeriodo = null) => {
  const rank = { ajuste: 0, aprobacion: 1, cancelacion_parcial: 2, cancelacion_total: 3, denegada: 4 };

  // Fechas en orden ascendente
  const fechas = [...new Set(eventos.map(e => e.fecha))].sort();

  let cursor = saldoInicialPeriodo;
  let saldoInicialDetectado = saldoInicialPeriodo ?? null;
  let salida = [];
  const valorDespues = (ev) =>
  typeof ev.saldoDespues === 'number'
    ? ev.saldoDespues
    : (typeof ev.saldoAntes === 'number' && typeof ev.deltaHoras === 'number'
        ? ev.saldoAntes + ev.deltaHoras
        : null);

    // Devuelve el saldo de arranque del día: un saldoAntes que no es saldoDespues de ningún otro evento del día
    const findSourceSaldoDelDia = (arr) => {
      const afters = new Set(arr.map(valorDespues).filter(v => typeof v === 'number'));
      const sources = arr
        .map(ev => ev.saldoAntes)
        .filter(v => typeof v === 'number' && !afters.has(v));
      return sources.length ? sources[0] : null;
    };

  for (const f of fechas) {
    // Eventos del día f (orden preliminar por tipo para estabilidad si falta info)
    const restantes = eventos
      .filter(e => e.fecha === f)
      .sort((a, b) => (a.ordenDia ?? rank[a.tipo] ?? 99) - (b.ordenDia ?? rank[b.tipo] ?? 99));

    // Intentar fijar un saldo de arranque del día encadenando por balances
    const source = findSourceSaldoDelDia(restantes);
    if (cursor == null && source != null) {
      cursor = source;
      if (saldoInicialDetectado == null) saldoInicialDetectado = source;
    } else if (cursor == null) {
      // Fallback: si no se pudo inferir, usa el primer saldoAntes disponible para no bloquear la cadena
      const cand = restantes.find(x => typeof x.saldoAntes === 'number');
      if (cand) {
        cursor = cand.saldoAntes;
        if (saldoInicialDetectado == null) saldoInicialDetectado = cand.saldoAntes;
      }
    }

    const ordenadosDia = [];
    while (restantes.length) {
      // 1) Buscar el que empareja exacto con cursor
      let idx = -1;
      if (cursor != null) {
        idx = restantes.findIndex(ev => typeof ev.saldoAntes === 'number' && ev.saldoAntes === cursor);
      }

      // 2) Si no hay match exacto, elegir el más cercano por |saldoAntes - cursor| y, en empate, por rank
      if (idx === -1) {
        let mejor = -1, mejorDist = Infinity, mejorOrden = Infinity;
        restantes.forEach((ev, i) => {
          if (typeof ev.saldoAntes === 'number' && cursor != null) {
            const dist = Math.abs(ev.saldoAntes - cursor);
            const ord = ev.ordenDia ?? (rank[ev.tipo] ?? 99);
            if (dist < mejorDist || (dist === mejorDist && ord < mejorOrden)) {
              mejor = i; mejorDist = dist; mejorOrden = ord;
            }
          }
        });
        idx = mejor !== -1 ? mejor : 0; // último recurso: primero de la lista
      }

      const ev = restantes.splice(idx, 1)[0];
      ordenadosDia.push(ev);

      // Avanzar el cursor con preferencia por saldoDespues (si no, saldoAntes+delta)
      if (typeof ev.saldoDespues === 'number') {
        cursor = ev.saldoDespues;
      } else if (typeof ev.deltaHoras === 'number' && typeof ev.saldoAntes === 'number') {
        cursor = ev.saldoAntes + ev.deltaHoras;
      } // si faltan datos, mantenemos cursor como está
    }

    salida = salida.concat(ordenadosDia);
  }

  return { eventosOrdenados: salida, saldoInicial: saldoInicialDetectado };
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
