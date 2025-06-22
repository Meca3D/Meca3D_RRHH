// stores/nominaStore.js
import { create } from 'zustand';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { convertirHorasMinutosADecimal } from '../utils/nominaUtils'
import { useAuthStore } from './authStore';

export const useNominaStore = create((set, get) => {
  let unsubscribeNiveles = null;
  let unsubscribeHorasExtra = null;

  return {
    // Estado principal
    nivelesSalariales: {},
    horasExtra: [],
    loading: false,
    error: null,
    initialized: false,
    currentYear: new Date().getFullYear(),

    loadNivelesSalariales: (año = null) => {
      const state = get();
      const targetYear = año || state.currentYear;
      
      if (unsubscribeNiveles) return () => {};

      set({ loading: true, initialized: true });
      
      unsubscribeNiveles = onSnapshot(
        doc(db, 'NIVELES_SALARIALES', targetYear.toString()),
        (docSnap) => {
          if (docSnap.exists()) {
            set({ 
              nivelesSalariales: { ...docSnap.data(), año: parseInt(docSnap.id) },
              loading: false,
              error: null 
            });
          } else {
            // Crear niveles por defecto si no existen
            get().createNivelesSalarialesDefault(targetYear);
          }
        },
        (error) => {
          console.error('Error en onSnapshot niveles:', error);
          set({ error: error.message, loading: false });
        }
      );

      return () => {
        if (unsubscribeNiveles) {
          unsubscribeNiveles();
          unsubscribeNiveles = null;
        }
      };
    },

    getHorasExtraByPeriod: (empleadoEmail, fechaInicio, fechaFin) => {
      if (unsubscribeHorasExtra) {
        unsubscribeHorasExtra();
      }

      set({ loading: true });

      unsubscribeHorasExtra = onSnapshot(
        collection(db, 'HORAS_EXTRA'),
        (snapshot) => {
          const todasLasHoras = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          let horasFiltradas = todasLasHoras.filter(hora => hora.empleadoEmail === empleadoEmail);
          
          if (fechaInicio && fechaFin) {
            horasFiltradas = horasFiltradas.filter(hora => {
              return hora.fecha >= fechaInicio && hora.fecha <= fechaFin;
            });
          }

          set({ 
            horasExtra: horasFiltradas.sort((a, b) => b.fecha.localeCompare(a.fecha)),
            loading: false,
            error: null 
          });
        },
        (error) => {
          console.error('Error en onSnapshot horas extra:', error);
          set({ error: error.message, loading: false });
        }
      );

      return () => {
        if (unsubscribeHorasExtra) {
          unsubscribeHorasExtra();
          unsubscribeHorasExtra = null;
        }
      };
    },


    addHorasExtra: async (horasExtraData) => {
      try {
      const horasDecimales = convertirHorasMinutosADecimal(
          horasExtraData.horas, 
          horasExtraData.minutos
        );

        const docRef = await addDoc(collection(db, 'HORAS_EXTRA'), {
          ...horasExtraData,
          horasDecimales, // ✅ Campo calculado para cálculos
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return docRef.id;
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

    updateHorasExtra: async (id, data) => {
      try {
        const docRef = doc(db, 'HORAS_EXTRA', id);
        await updateDoc(docRef, {
          ...data,
          updatedAt: new Date()
        });
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    calcularDatosNomina: (usuario, nivelesSalariales = null) => {
      const niveles = nivelesSalariales || get().nivelesSalariales;
      
      if (usuario.tipoNomina === "manual") {
        return {
          sueldoBase: usuario.sueldoBaseManual || 0,
          trienios: usuario.trieniosManual || 0,
          valorTrienio: usuario.valorTrienioManual || 0
        };
      } else {
        const nivelData = niveles.niveles?.[usuario.nivelSalarial];
        if (!nivelData) return { sueldoBase: 0, trienios: 0, valorTrienio: 0 };

        let trienios = 0;
        let valorTrienio = nivelData.valorTrienio;
      if (usuario.trieniosAutomaticos === true && usuario.fechaIngreso) {
      try {
        const añosServicio = get().calcularAñosServicio(usuario.fechaIngreso);
        trienios = Math.floor(añosServicio / 3);
      } catch (error) {
        console.error('Error calculando años de servicio:', error);
        trienios = usuario.trieniosManual || 0;
      }
    } else {
      trienios = usuario.trieniosManual || 0;
      if (usuario.valorTrienioManual && usuario.valorTrienioManual > 0) {
        valorTrienio = usuario.valorTrienioManual;
      }
    }

        return {
          sueldoBase: nivelData.sueldoBase,
          trienios,
          valorTrienio
        };
      }
    },

    saveUserNominaConfig: async (userEmail, formData) => {
      try {
        set({ loading: true, error: null });
        
        // Calcular datos usando la función de la store
        const niveles = get().nivelesSalariales;
        const { userProfile } = useAuthStore.getState(); // Obtener userProfile
    
        const usuarioCompleto = {
          ...formData,
          fechaIngreso: userProfile?.fechaIngreso, // ✅ AÑADIR fechaIngreso
          nivel: userProfile?.nivel // ✅ AÑADIR nivel si existe
        };
        const datosCalculados = get().calcularDatosNomina(usuarioCompleto, niveles);
        // Preparar datos completos
        const configCompleta = {
          ...formData,
          sueldoBaseFinal: datosCalculados.sueldoBase,
          trieniosFinal: datosCalculados.trienios,
          valorTrienioFinal: datosCalculados.valorTrienio,
          updatedAt: new Date()
        };

        // Guardar en Firestore
        await updateDoc(doc(db, 'USUARIOS', userEmail), configCompleta);
        
        set({ loading: false });
        return configCompleta; 
      } catch (error) {
        console.error('Error guardando configuración nómina:', error);
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    calcularAñosServicio: (fechaIngreso) => {
      const inicio = new Date(fechaIngreso);
      const ahora = new Date();


      const diffTime = Math.abs(ahora - inicio);
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
      return diffYears;
    },

    calcularTotalHorasExtra: (horasExtra) => {
      return horasExtra.reduce((total, hora) => {
        return total + (hora.importe || 0);
      }, 0);
    },

    calcularTotalHorasDecimales: (horasExtra) => {
      return horasExtra.reduce((total, hora) => {
        // ✅ Aquí SÍ usamos el cálculo de horas
        const horasCalculadas = hora.horasDecimales || 
          convertirHorasMinutosADecimal(hora.horas || 0, hora.minutos || 0);
        
        return total + horasCalculadas;
      }, 0);
    },

    calcularImporteHorasExtra: (horas, minutos, tarifa) => {
      const horasDecimales = convertirHorasMinutosADecimal(horas, minutos);
      return horasDecimales * (parseFloat(tarifa) || 0);
    },


    calcularNominaCompleta: (usuario, horasExtra = []) => {
      const datos = get().calcularDatosNomina(usuario);
      const totalHorasExtra = get().calcularTotalHorasExtra(horasExtra);
      const totalTrienios = datos.trienios * datos.valorTrienio;

      return {
        sueldoBase: datos.sueldoBase,
        trienios: datos.trienios,
        valorTrienio: datos.valorTrienio,
        totalTrienios,
        totalHorasExtra,
        totalNomina: datos.sueldoBase + totalTrienios + totalHorasExtra
      };
    },

    createNivelesSalarialesDefault: async (año) => {
      const nivelesDefault = {
        niveles: {
          1: { sueldoBase: 1100, valorTrienio: 25 },
          2: { sueldoBase: 1150, valorTrienio: 25 },
          3: { sueldoBase: 1200, valorTrienio: 25 },
          4: { sueldoBase: 1250, valorTrienio: 25 },
          5: { sueldoBase: 1300, valorTrienio: 25 },
          6: { sueldoBase: 1350, valorTrienio: 25 },
          7: { sueldoBase: 1400, valorTrienio: 25 },
          8: { sueldoBase: 1450, valorTrienio: 25 },
          9: { sueldoBase: 1500, valorTrienio: 25 },
          10: { sueldoBase: 1550, valorTrienio: 25 },
          11: { sueldoBase: 1600, valorTrienio: 25 },
          12: { sueldoBase: 1650, valorTrienio: 25 },
          13: { sueldoBase: 1700, valorTrienio: 25 },
          14: { sueldoBase: 1817.2, valorTrienio: 25 },
          15: { sueldoBase: 1900, valorTrienio: 25 },
          16: { sueldoBase: 1900, valorTrienio: 25 },
          17: { sueldoBase: 1900, valorTrienio: 25 },
          18: { sueldoBase: 1900, valorTrienio: 25 },
          19: { sueldoBase: 1900, valorTrienio: 25 },
          20: { sueldoBase: 1900, valorTrienio: 25 },
          21: { sueldoBase: 1900, valorTrienio: 25 }
        },
        tarifasHorasExtraBase: {
          normal: 15,
          nocturna: 19.75,
          festiva: 24.75,
          festivaNocturna: 29.75
        }
      };

      await setDoc(doc(db, 'NIVELES_SALARIALES', año.toString()), nivelesDefault);
      set({ nivelesSalariales: nivelesDefault });
    }
  };
});
