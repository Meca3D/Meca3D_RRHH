// stores/empleadosStore.js - IMPORTS CORREGIDOS
import { create } from 'zustand';
import { 
  collection, 
  onSnapshot,  
  doc,            
  updateDoc,    
  deleteDoc,     
  getDoc        
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const useEmpleadosStore = create((set, get) => {
  let unsubscribeEmpleados = null;

  return {
    empleados: [],
    empleadoSeleccionado: null,
    loading: false,
    error: null,

    fetchEmpleados: () => {
      if (unsubscribeEmpleados) {
        return () => {};
      }

      set({ loading: true, error: null });

      unsubscribeEmpleados = onSnapshot(
        collection(db, 'USUARIOS'), 
        (querySnapshot) => {
          const empleadosData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            email: doc.id,
            ...doc.data()
          }));

          set({ 
            empleados: empleadosData.sort((a, b) => a.nombre.localeCompare(b.nombre)),
            loading: false,
            error: null
          });
        },
        (error) => {
          console.error("Error en listener empleados:", error);
          set({ error: error.message, loading: false });
        }
      );

      return () => {
        if (unsubscribeEmpleados) {
          unsubscribeEmpleados();
          unsubscribeEmpleados = null;
        }
      };
    },

    fetchEmpleadoPorEmail: async (email) => {
      try {
        set({ loading: true, error: null });
        
        const docRef = doc(db, 'USUARIOS', email); 
        const docSnap = await getDoc(docRef);     
        
        if (docSnap.exists()) {
          const empleadoData = {
            id: email,
            email: email,
            ...docSnap.data()
          };
          
          set({ 
            empleadoSeleccionado: empleadoData,
            loading: false 
          });
          
          return empleadoData;
        } else {
          set({ error: 'Empleado no encontrado', loading: false });
          return null;
        }
      } catch (error) {
        set({ error: error.message, loading: false });
        return null;
      }
    },

    updateEmpleado: async (email, datosActualizados) => {
      try {
        set({ loading: true, error: null });
        
        const docRef = doc(db, 'USUARIOS', email);   
        await updateDoc(docRef, {                        
          ...datosActualizados,
          updatedAt: new Date().toISOString()
        });

        set(state => ({
          empleados: state.empleados.map(emp => 
            emp.email === email ? { ...emp, ...datosActualizados } : emp
          ),
          empleadoSeleccionado: state.empleadoSeleccionado?.email === email 
            ? { ...state.empleadoSeleccionado, ...datosActualizados }
            : state.empleadoSeleccionado,
          loading: false
        }));

        return true;
      } catch (error) {
        set({ error: error.message, loading: false });
        return false;
      }
    },

    deleteEmpleado: async (email) => {
      try {
        set({ loading: true, error: null });

       await deleteDoc(doc(db, 'USUARIOS', email));

        const response = await fetch('/api/delete-employee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const result = await response.json();
        
        if (result.success || result.partialFailure) {
          console.log('Empleado eliminado:', result.message);
        }

        set({ loading: false });
        return true;
        
      } catch (error) {
        set({ error: error.message, loading: false });
        return false;
      }
    },

    // ✅ Métodos de utilidad
    clearEmpleadoSeleccionado: () => {
      set({ empleadoSeleccionado: null });
    },

    clearError: () => {
      set({ error: null });
    },

    cleanup: () => {
      if (unsubscribeEmpleados) {
        unsubscribeEmpleados();
        unsubscribeEmpleados = null;
      }
      set({ empleados: [], empleadoSeleccionado: null });
    }
  };
});
