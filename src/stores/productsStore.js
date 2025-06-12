// src/stores/productsStore.js
import { create } from 'zustand';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useProductsStore = create((set, get) => {
  let unsubscribe = null; // Variable para el listener

  return {
    products: [],
    loading: false,
    error: null,
    initialized: false, // ✅ Flag para saber si ya se cargó
    

fetchProducts: () => {
  // ✅ AÑADIR: Evitar múltiples listeners
   const state = get();
      if (state.initialized || unsubscribe) {
        return () => {};
      }
  set({ loading: true, isListening: true });
  const q = collection(db, 'PRODUCTOS');
  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      // ✅ Ordenar en el cliente
      .sort((a, b) => {
        if (a.tipo === b.tipo) {
          return a.nombre.localeCompare(b.nombre);
        }
        return a.tipo.localeCompare(b.tipo);
      });
      
      set({ products, loading: false, error: null });
    },
    (error) => {
      set({ error: error.message, loading: false, isListening: false });
    }
  );

  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      set({ isListening: false });
    }
  };
},

// 
    isDataLoaded: () => {
      const state = get();
      return state.products.length > 0 && state.initialized;
    },

    createProduct: async (productData) => {
      set({ loading: true, error: null });
      try {
        const docRef = await addDoc(collection(db, 'PRODUCTOS'), productData);
        set({ loading: false });
        return docRef.id;
      } catch (error) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    updateProduct: async (id, updates) => {
      set({ loading: true, error: null });
      try {
        const ref = doc(db, 'PRODUCTOS', id);
        await updateDoc(ref, updates);
        set({ loading: false });
      } catch (error) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    deleteProduct: async (id) => {
      set({ loading: true, error: null });
      try {
        const ref = doc(db, 'PRODUCTOS', id);
        await deleteDoc(ref);
        set({ loading: false });
      } catch (error) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    cleanup: () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
        set({ isListening: false });
      }
    },

    // Getters/Selectores
    getProductsByType: (tipo) => {
      const products = get().products;
      return products
        .filter(p => p.tipo === tipo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    },

    getAllSorted: () => {
      const products = get().products;
      return [...products].sort((a, b) => {
        if (a.tipo === b.tipo) {
          return a.nombre.localeCompare(b.nombre);
        }
        return a.tipo.localeCompare(b.tipo);
      });
    },

    // Método para verificar si un producto existe
    getProductById: (id) => {
      const products = get().products;
      return products.find(p => p.id === id);
    },

    // Método para obtener productos por categoría (para ProductList)
    getFilteredProducts: (category, searchTerm = '') => {
      const state = get();
      const { products } = state;
      
      return products
        .filter(product => {
          // Filtrar por categoría
          if (category === 'favoritos') {
            // Este filtro se manejará en el componente con userProfile
            return true;
          }
          return product.tipo === category;
        })
        .filter(product =>
          // Filtrar por término de búsqueda
          product.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  };
});
