// stores/authStore.js
import { create } from 'zustand';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useAuthStore = create((set, get) => ({
  // Estado inicial
  user: null,
  userRole: null,
  userProfile: null,
  loading: true,
  isAuthenticated: false,
  initialized: false, // ✅ Flag para saber si ya se cargó

  // Añadir favorito
addFavorite: async (productId) => {
  const { userProfile } = get();
  try {
    const userRef = doc(db, 'USUARIOS', userProfile.email);
    await updateDoc(userRef, {
      favoritos: arrayUnion(productId)
    });
    set({ 
      userProfile: {
        ...userProfile,
        favoritos: [...userProfile.favoritos, productId]
      }
    });
  } catch (error) {
    console.error("Error al añadir favorito:", error);
  }
},

  // Quitar favorito
  removeFavorite: async (productId) => {
    const { userProfile } = get();
    if (!userProfile) return;
    set({ loading: true });
    try {
      const userRef = doc(db, 'USUARIOS', userProfile.email);
      await updateDoc(userRef, { favoritos: arrayRemove(productId) });
      set(state => ({
        userProfile: {
          ...state.userProfile,
          favoritos: (state.userProfile.favoritos || []).filter(id => id !== productId)
        },
        loading: false
      }));
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // ¿Es favorito?
  isFavorite: (productId) => {
    const { userProfile } = get();
    return userProfile?.favoritos?.includes(productId);
  },


  // Acciones
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    loading: false 
  }),
  
  setUserRole: (role) => set({ userRole: role }),
  
  setUserProfile: (profile) => set({ userProfile: profile }),
  
  logout: () => set({ 
    user: null, 
    userRole: null, 
    userProfile: null,
    isAuthenticated: false,
    loading: false 
  }),

  // Getters para tus roles específicos
  isOwner: () => get().userRole === 'owner',
  isAdmin: () => get().userRole === 'admin',
  isUser: () => get().userRole === 'user',
  canManageUsers: () => ['owner', 'admin'].includes(get().userRole),
  isAdminOrOwner: () => ['admin', 'owner'].includes(get().userRole),
}));
