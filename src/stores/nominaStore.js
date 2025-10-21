// stores/nominaStore.js
import { create } from 'zustand';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, query, where, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { convertirHorasMinutosADecimal } from '../utils/nominaUtils'
import { useAuthStore } from './authStore';

export const useNominaStore = create((set, get) => {
  let unsubscribeNiveles = null;
  let unsubscribeHorasExtra = null;
  let unsubscribeConfiguracion = null;
  let unsubscribeNominas = null

  return {
    // Estado principal
    nivelesSalariales: {},
    horasExtra: [],
    loading: false,
    error: null,
    initialized: false,
    currentYear: new Date().getFullYear(),
    configuracionNomina: null,
    nominasGuardadas: [],
    loadingConfiguracion: false,

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
 set({ 
              nivelesSalariales: {
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
          21: { sueldoBase: 1900, valorTrienio: 25 },
          año: targetYear.toString()
        },
          loading: false,
          error: null 
      }
   })
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

    // Cargar niveles salariales de un año específico con onSnapshot
    loadNivelesSalarialesAno: (año) => {
      if (unsubscribeNiveles) {
        unsubscribeNiveles();
        unsubscribeNiveles = null;
      }

      set({ loading: true });

      const docRef = doc(db, 'NIVELES_SALARIALES', año.toString());

      unsubscribeNiveles = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            set({ nivelesSalariales: data.niveles || {}, loading: false });
          } else {
            set({ nivelesSalariales: {}, loading: false });
          }
        },
        (error) => {
          console.error('Error cargando niveles salariales:', error);
          set({ nivelesSalariales: {}, loading: false, error: error.message });
        }
      );

      return () => {
        if (unsubscribeNiveles) {
          unsubscribeNiveles();
          unsubscribeNiveles = null;
        }
      };
    },

    // Obtener años disponibles con niveles salariales
    obtenerAñosConNiveles: async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'NIVELES_SALARIALES'));
        const años = querySnapshot.docs.map(doc => parseInt(doc.id)).sort((a, b) => b - a);
        return años;
      } catch (error) {
        console.error('Error obteniendo años con niveles:', error);
        return [];
      }
    },

    // Copiar niveles de un año a otro
    copiarNivelesAño: async (añoOrigen, añoDestino) => {
      try {
        const docRefOrigen = doc(db, 'NIVELES_SALARIALES', añoOrigen.toString());
        const docSnapOrigen = await getDoc(docRefOrigen);

        if (!docSnapOrigen.exists()) {
          throw new Error(`No hay niveles salariales configurados para ${añoOrigen}`);
        }

        const nivelesOrigen = docSnapOrigen.data().niveles || {};
        
        if (Object.keys(nivelesOrigen).length === 0) {
          throw new Error(`No hay niveles para copiar del año ${añoOrigen}`);
        }

        const docRefDestino = doc(db, 'NIVELES_SALARIALES', añoDestino.toString());
        await setDoc(docRefDestino, { 
          niveles: nivelesOrigen,
          updatedAt: new Date(),
          updatedBy: useAuthStore.getState().user?.email || 'system'
        });

        return { copiados: Object.keys(nivelesOrigen).length };
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    // Editar un nivel específico
    editarNivelSalarial: async (año, numeroNivel, nuevosDatos) => {
      try {
        const docRef = doc(db, 'NIVELES_SALARIALES', año.toString());
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error('No se encontraron niveles para este año');
        }

        const nivelesActuales = docSnap.data().niveles || {};

        // Validar que el nivel existe
        if (!nivelesActuales[numeroNivel]) {
          throw new Error(`El nivel ${numeroNivel} no existe`);
        }

        // Actualizar el nivel específico
        await updateDoc(docRef, {
          [`niveles.${numeroNivel}`]: nuevosDatos,
          updatedAt: new Date(),
          updatedBy: useAuthStore.getState().user?.email || 'system'
        });

        return true;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

    // Aplicar incremento masivo por porcentaje
    aplicarIncrementoMasivo: async (año, porcentaje, aplicarASueldoBase = true, aplicarATrienio = false) => {
      try {
        const docRef = doc(db, 'NIVELES_SALARIALES', año.toString());
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error('No se encontraron niveles para este año');
        }

        const nivelesActuales = docSnap.data().niveles || {};
        const nivelesActualizados = {};

        // Aplicar incremento a cada nivel
        Object.keys(nivelesActuales).forEach(nivel => {
          const nivelActual = nivelesActuales[nivel];
          nivelesActualizados[nivel] = {
            sueldoBase: aplicarASueldoBase 
              ? parseFloat((nivelActual.sueldoBase * (1 + porcentaje / 100)).toFixed(2))
              : nivelActual.sueldoBase,
            valorTrienio: aplicarATrienio
              ? parseFloat((nivelActual.valorTrienio * (1 + porcentaje / 100)).toFixed(2))
              : nivelActual.valorTrienio
          };
        });

        await updateDoc(docRef, {
          niveles: nivelesActualizados,
          updatedAt: new Date(),
          updatedBy: useAuthStore.getState().user?.email || 'system'
        });

        return { 
          actualizados: Object.keys(nivelesActualizados).length,
          porcentaje
        };
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },


    getHorasExtraByPeriod: (empleadoEmail, fechaInicio, fechaFin) => {
      if (unsubscribeHorasExtra) {
        unsubscribeHorasExtra();
      }

      set({ loading: true });

      unsubscribeHorasExtra = onSnapshot(
        query(
        collection(db, 'HORAS_EXTRA'),
        where('empleadoEmail', '==', empleadoEmail)),
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

    updateConfiguracionNomina: async (userEmail, configuracion) => {
      try {
        set({ loadingConfiguracion: true });
        await updateDoc(doc(db, 'USUARIOS', userEmail), {
          configuracionNomina: {
            ...configuracion,
            updatedAt: new Date().toISOString()
          }
        });
        // onSnapshot se encarga del resto
      } catch (error) {
        set({ error: error.message, loadingConfiguracion: false });
        throw error;
      }
    },

    // ✅ NUEVO: Cleanup all listeners
cleanup: () => {

      if (unsubscribeNiveles) {
        unsubscribeNiveles();
        unsubscribeNiveles = null;
      }
      if (unsubscribeHorasExtra) { 
        unsubscribeHorasExtra();
        unsubscribeHorasExtra = null;
      }
      if (unsubscribeConfiguracion) {
        unsubscribeConfiguracion();
        unsubscribeConfiguracion = null;
      }
      if (unsubscribeNominas) {
        unsubscribeNominas();
        unsubscribeNominas = null;
      }
      // Resetear estados relevantes
      set({
        nivelesSalariales: {},
        horasExtra: [],
        configuracionNomina: null,
        nominasGuardadas: [],
        loading: false,
        error: null,
        initialized: false,
        loadingConfiguracion: false
      });
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

    calcularAñosServicio: (fechaIngreso, fechaNomina = new Date()) => {
      const inicio = new Date(fechaIngreso);
      const nomina = new Date(fechaNomina);
      const diffTime = Math.abs(nomina.getTime() - inicio.getTime());
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
  loadConfiguracionUsuario: (userEmail) => {
      const { isAuthenticated, user } = useAuthStore.getState();
      if (!isAuthenticated || !user || user.email !== userEmail) {
        if (unsubscribeConfiguracion) {
          unsubscribeConfiguracion();
          unsubscribeConfiguracion = null;
        }
        set({ configuracionNomina: null, loadingConfiguracion: false, error: "Sin permisos para acceder a configuración" });
        return () => {};
      }

      if (unsubscribeConfiguracion) {
        return () => {};
      }

      set({ loadingConfiguracion: true });

      unsubscribeConfiguracion = onSnapshot(
        doc(db, 'USUARIOS', userEmail),
        (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            set({ 
              configuracionNomina: userData.configuracionNomina || null,
              loadingConfiguracion: false
            });
          } else {
            set({ 
              configuracionNomina: null,
              loadingConfiguracion: false
            });
          }
        },
        (error) => {
          console.error('Error en listener configuración:', error);
          set({ error: error.message, loadingConfiguracion: false });
        }
      );

      return () => {
        if (unsubscribeConfiguracion) {
          unsubscribeConfiguracion();
          unsubscribeConfiguracion = null;
        }
      };
    },


    loadNominasUsuario: (userEmail) => {
const { isAuthenticated, user } = useAuthStore.getState();
      if (!isAuthenticated || !user || user.email !== userEmail) {
        if (unsubscribeNominas) {
          unsubscribeNominas();
          unsubscribeNominas = null;
        }
        set({ nominasGuardadas: [], loading: false, error: "Sin permisos para acceder a nóminas" });
        return () => {};
      }

      if (unsubscribeNominas) {
        return () => {};
      }
      unsubscribeNominas = onSnapshot(
        query(collection(db, 'NOMINAS'), where('empleadoEmail', '==', userEmail)),
        (snapshot) => {
          const nominas = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          set({ 
            nominasGuardadas: nominas.sort((a, b) => {
              if (a.año === b.año) {
                return b.mes - a.mes;
              }
              return b.año - a.año;
            })
          });
        },
        (error) => {
          console.error('Error en listener nóminas:', error);
          set({ error: error.message });
        }
      );

      return () => {
        if (unsubscribeNominas) {
          unsubscribeNominas();
          unsubscribeNominas = null;
        }
      };
    },

    calcularNominaCompleta: (configuracion, numeroTrienios, horasExtra = [], extra,deduccion) => {
      if (!configuracion) {
        return {
          sueldoBase: 0,
          trienios: 0,
          valorTrienio: 0,
          totalTrienios: 0,
          otrosComplementos: [],
          extra,
          deduccion,
          totalOtrosComplementos: 0,
          totalHorasExtra: 0,
          totalNomina: 0
        };
      }

      const totalHorasExtra = get().calcularTotalHorasExtra(horasExtra);
      const totalTrienios = (numeroTrienios || 0) * (configuracion.valorTrienio || 0);

      const otrosComplementos = [];
      let totalOtrosComplementos = 0;
      
      if (configuracion.tieneOtrosComplementos) {
        if (configuracion.otroComplemento1?.concepto && configuracion.otroComplemento1?.importe) {
          otrosComplementos.push(configuracion.otroComplemento1);
          totalOtrosComplementos += configuracion.otroComplemento1.importe;
        }
        if (configuracion.otroComplemento2?.concepto && configuracion.otroComplemento2?.importe) {
          otrosComplementos.push(configuracion.otroComplemento2);
          totalOtrosComplementos += configuracion.otroComplemento2.importe;
        }
      }

      const totalNomina = (configuracion.sueldoBase || 0) + totalTrienios + totalOtrosComplementos + totalHorasExtra + extra - deduccion;

      return {
        sueldoBase: configuracion.sueldoBase || 0,
        trienios: numeroTrienios || 0,
        valorTrienio: configuracion.valorTrienio || 0,
        totalTrienios,
        extra,
        deduccion,
        otrosComplementos,
        totalOtrosComplementos,
        totalHorasExtra,
        totalNomina
      };
    },

getEstadisticasPeriodoNomina: (nominas) => {
      const totalNominaNeta = nominas.reduce((sum, n) => sum + (n.total || 0), 0); 
      const totalSueldoBase = nominas.reduce((sum, n) => sum + (n.sueldoBase || 0), 0);
      const totalTrienios = nominas.reduce((sum, n) => sum + (n.trienios || 0), 0); 

      // Sumar importes de horasExtra.desglose
      const totalHorasExtra = nominas.reduce((sum, n) => 
        sum + (n.horasExtra?.desglose?.reduce((hSum, h) => hSum + (h.importe || 0), 0) || 0)
      , 0);

      // Sumar importes de otrosComplementos
      const totalOtrosComplementos = nominas.reduce((sum, n) => 
        sum + (n.otrosComplementos?.reduce((cSum, c) => cSum + (c.importe || 0), 0) || 0)
      , 0);

      // Acceder a .cantidad de extra y deduccion
      const totalExtra = nominas.reduce((sum, n) => sum + (n.extra?.cantidad || 0), 0);
      const totalDeduccion = nominas.reduce((sum, n) => sum + (n.deduccion?.cantidad || 0), 0);

      // Para el desglose:
      const breakdown = {
          'Sueldo Base': totalSueldoBase,
          'Trienios': totalTrienios,
          'Otros Complementos': totalOtrosComplementos,
          'Horas Extra': totalHorasExtra,
          'Extras Adicionales': totalExtra,
          'Deducciones Adicionales': totalDeduccion
      };

      return {
          totalNominaNeta,
          totalSueldoBase,
          totalTrienios,
          totalOtrosComplementos,
          totalHorasExtra,
          totalExtra,
          totalDeduccion,
          breakdown,
          count: nominas.length
      };
    },

    guardarNomina: async (nominaData) => {
      try {
        const docRef = await addDoc(collection(db, 'NOMINAS'), {
          ...nominaData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return docRef.id;
      } catch (error) {
        set({ error: error.message });
        throw error;
      }
    },

      borrarNomina: async (nominaId) => {
    try {
      await deleteDoc(doc(db, 'NOMINAS', nominaId));
      return true;
    } catch (error) {
      set({ error: error.message });
      return false;
    }
  },

    actualizarNomina: async (nominaId, datosActualizados) => {
    try {
      await updateDoc(doc(db, 'NOMINAS', nominaId), {
        ...datosActualizados,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      set({ error: error.message });
      return false;
    }
  },

    getNominaById: async (nominaId) => {
      set({ loading: true, error: null });
      try {
        const docSnap = await getDoc(doc(db, 'NOMINAS', nominaId));
        if (docSnap.exists()) {
          set({ loading: false });
          return { id: docSnap.id, ...docSnap.data() };
        } else {
          set({ loading: false });
          return null;
        }
      } catch (error) {
        console.error("Error al obtener nómina por ID:", error);
        set({ error: error.message, loading: false });
        return null;
      }
    },

        buscarNominaPorMesAno: async (userEmail, mes, año) => {
      try {
        const nominasRef = collection(db, 'NOMINAS');
        const q = query(
          nominasRef,
          where('empleadoEmail', '==', userEmail),
          where('mes', '==', mes),
          where('año', '==', año),
          where('tipo', '==', 'mensual')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          return { id: doc.id, ...doc.data() };
        }
        return null;
      } catch (error) {
        console.error('Error buscando nómina:', error);
        return null;
      }
    },

    // Obtener período de horas extras de una nómina específica
    obtenerPeriodoHorasExtras: async (userEmail, mesesAtras) => {
      try {
        const fechaReferencia = new Date();
        fechaReferencia.setMonth(fechaReferencia.getMonth() - mesesAtras);
        
        const mes = fechaReferencia.toLocaleDateString('es-ES', { month: 'long' });
        const año = fechaReferencia.getFullYear();
        
        const nomina = await get().buscarNominaPorMesAno(userEmail, 
          mes.charAt(0).toUpperCase() + mes.slice(1), año);
        
        if (nomina && nomina.periodoHorasExtra) {
          return {
            fechaInicio: nomina.periodoHorasExtra.fechaInicio,
            fechaFin: nomina.periodoHorasExtra.fechaFin,
            encontrada: true
          };
        }
        
        return { encontrada: false };
      } catch (error) {
        console.error('Error obteniendo período:', error);
        return { encontrada: false };
      }
    },

        checkDuplicateNomina: async (userEmail, mes, año, tipoNomina, tipoPagaExtra = null) => {
      try {
        let q;
        const nominasRef = collection(db, 'NOMINAS');

        if (tipoNomina === 'mensual') {
          q = query(
            nominasRef,
            where('empleadoEmail', '==', userEmail),
            where('mes', '==', mes),
            where('año', '==', año),
            where('tipo', '==', 'mensual')
          );
        } else {
          q = query(
            nominasRef,
            where('empleadoEmail', '==', userEmail),
            where('año', '==', año),
            where('tipo', '==', 'paga extra'),
            where('mes', '==', tipoPagaExtra)
          );
        }

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          return { exists: true, message: `Ya existe una nómina ${tipoNomina === 'mensual' ? `para ${mes} de ${año}` : `${tipoPagaExtra} del año ${año}`}.` };
        }
        return { exists: false, message: '' };
      } catch (error) {
        console.error('Error al verificar duplicados de nómina:', error);
        return { exists: false, message: 'Error al verificar duplicados.' };
      }
    },



  };
});
