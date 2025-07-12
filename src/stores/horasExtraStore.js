// stores/horasExtraStore.js
import { create } from 'zustand';
import { where, query, orderBy, collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { convertirHorasMinutosADecimal } from '../utils/nominaUtils';

export const useHorasExtraStore = create((set, get) => {
  let unsubscribeHorasExtra = null;

  return {
    // Estado principal
    horasExtra: [],
    loading: false,
    error: null,

   fetchHorasExtra: (userEmail, fechaInicio = null, fechaFin = null) => {
      if (unsubscribeHorasExtra) {
        unsubscribeHorasExtra();
      }

      set({ loading: true });

      try {
        let horasExtraQuery;

        if (fechaInicio && fechaFin) {
          // ✅ Query optimizada con filtros de fecha en servidor
          horasExtraQuery = query(
            collection(db, 'HORAS_EXTRA'),
            where('empleadoEmail', '==', userEmail),
            where('fecha', '>=', fechaInicio),
            where('fecha', '<=', fechaFin),
            orderBy('fecha', 'asc')
          );
        } else {
          // ✅ Query básica solo por empleado
          horasExtraQuery = query(
            collection(db, 'HORAS_EXTRA'),
            where('empleadoEmail', '==', userEmail),
            orderBy('fecha', 'asc')
          );
        }

             unsubscribeHorasExtra = onSnapshot(
          horasExtraQuery,
          (snapshot) => {
            const horasData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            set({ 
              horasExtra: horasData, 
              loading: false,
              error: null 
            });
          },
          (error) => {
            console.error('Error en onSnapshot horas extra:', error);
            
            if (error.code === "failed-precondition") {
              // ✅ Error de índice faltante
              console.log("🔍 Índice compuesto requerido. Usando query básica...");
              // Fallback a query básica
              get().fetchHorasExtraBasic(userEmail, fechaInicio, fechaFin);
            } else if (error.code === "permission-denied") {
              console.log("Listener horas extra: permission-denied ignorado", error);
              set({ 
                horasExtra: [], 
                loading: false, 
                error: "Sin permisos para acceder a horas extra" 
              });
            } else {
              set({ error: error.message, loading: false });
            }
          }
        );

      } catch (error) {
        console.error('Error creando query:', error);
        // Fallback a método básico
        get().fetchHorasExtraBasic(userEmail, fechaInicio, fechaFin);
      }

      return () => {
        if (unsubscribeHorasExtra) {
          unsubscribeHorasExtra();
          unsubscribeHorasExtra = null;
        }
      };
    },
    fetchHorasExtraBasic: (userEmail, fechaInicio = null, fechaFin = null) => {
      if (unsubscribeHorasExtra) {
        unsubscribeHorasExtra();
      }

      set({ loading: true });

      const horasExtraQuery = query(
        collection(db, 'HORAS_EXTRA'),
        where('empleadoEmail', '==', userEmail),
        orderBy('fecha', 'asc')
      );

      unsubscribeHorasExtra = onSnapshot(
        horasExtraQuery,
        (snapshot) => {
          console.log('🔍 Snapshot básico recibido:', snapshot.docs.length, 'horas extra');
          
          let horasData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // ✅ Filtrar por fechas en cliente como fallback
          if (fechaInicio && fechaFin) {
            horasData = horasData.filter(hora => {
              return hora.fecha >= fechaInicio && hora.fecha <= fechaFin;
            });
          }

          set({ 
            horasExtra: horasData,
            loading: false,
            error: null 
          });
        },
        (error) => {
          console.error('Error en query básica:', error);
          set({ error: error.message, loading: false });
        }
      );
    },

    addHorasExtra: async (horasExtraData) => {
      try {
        const horasDecimales = convertirHorasMinutosADecimal(
          horasExtraData.horas, 
          horasExtraData.minutos
        );

        const docRef = await addDoc(collection(db, 'HORAS_EXTRA'), {
          ...horasExtraData,
          horasDecimales,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return docRef.id;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    updateHorasExtra: async (id, data) => {
      try {
        const horasDecimales = convertirHorasMinutosADecimal(
          data.horas || 0, 
          data.minutos || 0
        );

        await updateDoc(doc(db, 'HORAS_EXTRA', id), {
          ...data,
          horasDecimales,
          updatedAt: new Date()
        });
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    deleteHorasExtra: async (id) => {
      try {
        await deleteDoc(doc(db, 'HORAS_EXTRA', id));
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    calcularImporteHorasExtra: (horas, minutos, tarifa) => {
      const horasDecimales = convertirHorasMinutosADecimal(horas, minutos);
      return horasDecimales * (parseFloat(tarifa) || 0);
    },

    calcularTotalHorasDecimales: (horasExtra) => {
      return horasExtra.reduce((total, hora) => {
        const horasCalculadas = hora.horasDecimales || 
          convertirHorasMinutosADecimal(hora.horas || 0, hora.minutos || 0);
        return total + horasCalculadas;
      }, 0);
    },

    calcularTotalHorasExtra: (horasExtra) => {
      return horasExtra.reduce((total, hora) => {
        return total + (hora.importe || 0);
      }, 0);
    },

    getEstadisticasPeriodo: (horasExtra, fechaInicio, fechaFin) => {
      const horasPeriodo = horasExtra.filter(hora => 
        hora.fecha >= fechaInicio && hora.fecha <= fechaFin
      );

      const totalHoras = get().calcularTotalHorasDecimales(horasPeriodo);
      const totalImporte = get().calcularTotalHorasExtra(horasPeriodo);

      // Desglose por tipo
      const porTipo = {};
      horasPeriodo.forEach(hora => {
        if (!porTipo[hora.tipo]) {
          porTipo[hora.tipo] = { horas: 0, importe: 0, count: 0 };
        }
        const horasDecimales = hora.horasDecimales || 
          convertirHorasMinutosADecimal(hora.horas || 0, hora.minutos || 0);
        
        porTipo[hora.tipo].horas += horasDecimales;
        porTipo[hora.tipo].importe += hora.importe || 0;
        porTipo[hora.tipo].count += 1;
      });

      return {
        totalHoras,
        totalImporte,
        totalRegistros: horasPeriodo.length,
        porTipo,
        promedioDiario: horasPeriodo.length > 0 ? totalHoras / horasPeriodo.length : 0
      };
    },

    clearHorasExtra: () => {
      if (unsubscribeHorasExtra) {
        unsubscribeHorasExtra();
        unsubscribeHorasExtra = null;
      }
      set({ horasExtra: [], loading: false, error: null });
    }
  };
});
