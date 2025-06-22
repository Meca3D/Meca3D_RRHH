// src/stores/ordersStore.js
import { create } from 'zustand';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthStore } from './authStore';

export const useOrdersStore = create((set, get) => {
  let unsubscribe = null;
  return {
  orders: [],
  loading: false,
  error: null,
  initialized: false, 

  fetchOrders: () => {
    const state = get();
      
    if (state.initialized || unsubscribe) {
        return () => {};
      }
    set({loading: true, initialized: true, error: null });
    unsubscribe = onSnapshot(
      collection(db, 'PEDIDOS'),
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          fechaReserva: doc.data().fechaReserva?.toDate?.() || null
        }));
           set({ 
            orders, 
            loading: false, 
            error: null 
          });
      },
      (error) => {set({ error: error.message, loading: false })
                set({ 
            error: error.message, 
            loading: false, 
            initialized: false 
          });
        }
    );
    return () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
          set({ initialized: false });
                 }
      };
  },

      isDataLoaded: () => {
      const state = get();
      return state.orders.length > 0 && state.initialized;
    },

  createOrder: async (orderData) => {
    set({ loading: true, error: null });
    try {
      const docRef = await addDoc(collection(db, 'PEDIDOS'), orderData);
      set({ loading: false });
      return docRef.id;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteOrder: async (orderId) => {
    set({ error: null });
    try {
      await deleteDoc(doc(db, 'PEDIDOS', orderId));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateOrderUsers: async (orderId, userEmail, products) => {
    set({ loading: true, error: null });
    try {
      const orderRef = doc(db, 'PEDIDOS', orderId);
      const state = get();
      const order = state.orders.find(o => o.id === orderId);
      
      if (!order) throw new Error('Pedido no encontrado');
      
      const { userProfile } = useAuthStore.getState();
      const userName = userProfile?.nombre 
      const usuarios = order.usuarios || [];
      const userIndex = usuarios.findIndex(u => u.id === userEmail);
      
          if (userIndex >= 0) {
      // Actualizar usuario existente
      usuarios[userIndex] = {
        id: userEmail,
        nombre: userName, 
        productos: products.map(p => p.id)
      };
      } else {
        usuarios.push({
          id: userEmail,
          nombre: userName,
          productos: products.map(p => p.id)
        });
      }
      
      await updateDoc(orderRef, { usuarios });
      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  removeUserFromOrder: async (orderId, userEmail) => {
    set({ loading: true, error: null });
    try {
      const orderRef = doc(db, 'PEDIDOS', orderId);
      const state = get();
      const order = state.orders.find(o => o.id === orderId);
      
      if (!order) throw new Error('Pedido no encontrado');
      
      const usuarios = (order.usuarios || []).filter(u => u.id !== userEmail);
      await updateDoc(orderRef, { usuarios });
      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}});
