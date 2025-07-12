// stores/authStore.js - AUTO-INICIALIZACIÓN
import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// ✅ NUEVO: Inicialización automática fuera del store
let authInitialized = false;
let unsubscribeAuth = null;
let unsubscribeUserProfile = null;

export const useAuthStore = create((set, get) => {
  
  // ✅ AUTO-INICIALIZACIÓN: Solo la primera vez que se crea el store
  if (!authInitialized) {
    authInitialized = true;
    
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {

      if (user) {
        
        set({
          user,
          isAuthenticated: true,
          loading: true,
          initialized: true
        });
        
        // Cargar perfil
        loadUserProfileFunction(user.email, set, get);
      } else {
        
        set({
          user: null,
          userRole: null,
          userProfile: null,
          isAuthenticated: false,
          loading: false, // ✅ CLAVE: Salir de loading
          initialized: true
        });
      }
    });
  }

  return {
    // Estado inicial
    user: null,
    userRole: null,
    userProfile: null,
    loading: true,
    isAuthenticated: false,
    initialized: false,

    initializeAuth: () => {
      return () => {}; 
    },

    // Favoritos
    addFavorite: async (productId) => {
      const { userProfile } = get();
      try {
        const userRef = doc(db, 'USUARIOS', userProfile.email);
        await updateDoc(userRef, { favoritos: arrayUnion(productId) });
        set({
          userProfile: {
            ...userProfile,
            favoritos: [...(userProfile.favoritos || []), productId]
          }
        });
      } catch (error) {
        console.error("Error al añadir favorito:", error);
      }
    },

    removeFavorite: async (productId) => {
      const { userProfile } = get();
      if (!userProfile) return;
      try {
        const userRef = doc(db, 'USUARIOS', userProfile.email);
        await updateDoc(userRef, { favoritos: arrayRemove(productId) });
        set(state => ({
          userProfile: {
            ...state.userProfile,
            favoritos: (state.userProfile.favoritos || []).filter(id => id !== productId)
          }
        }));
      } catch (error) {
        console.error("Error al remover favorito:", error);
      }
    },

    isFavorite: (productId) => {
      const { userProfile } = get();
      return userProfile?.favoritos?.includes(productId);
    },

    setUserProfile: (profile) => {
      set({ userProfile: { ...get().userProfile, ...profile } });
    },

    logout: () => {
            if (unsubscribeAuth) {
        unsubscribeAuth();
        unsubscribeAuth = null;
      }
      if (unsubscribeUserProfile) {
        unsubscribeUserProfile();
        unsubscribeUserProfile = null;
      }

      authInitialized = false;
      
      set({
        user: null,
        userRole: null,
        userProfile: null,
        isAuthenticated: false,
        loading: false,
        initialized: false
      });
    },

    // Getters para roles
    isOwner: () => get().userRole === 'owner',
    isAdmin: () => get().userRole === 'admin',
    isUser: () => get().userRole === 'user',
    canManageUsers: () => ['owner', 'admin'].includes(get().userRole),
    isAdminOrOwner: () => ['admin', 'owner'].includes(get().userRole),
  };
});

const loadUserProfileFunction = (userEmail, set) => {
  if (unsubscribeUserProfile) {
    unsubscribeUserProfile();
  }

  unsubscribeUserProfile = onSnapshot(
    doc(db, 'USUARIOS', userEmail),
    (docSnap) => {
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        
        set({ 
          userProfile: {
            email: userEmail,
            nombre: userData.nombre,
            rol: userData.rol,
            fechaIngreso: userData.fechaIngreso,
            photoURL: userData.photoURL || null,
            favoritos: userData.favoritos || [],
            puesto: userData.puesto,
            nivel: userData.nivel,
            vacaDias: userData.vacaDias,
            vacaHoras: userData.vacaHoras,
            configuracionNomina: userData.configuracionNomina,
            tarifasHorasExtra: userData.tarifasHorasExtra,


          },
          userRole: userData.rol,
          loading: false
        });

      } else {
        set({ 
          userProfile: {
            email: userEmail,
            nombre: 'Usuario',
            rol: 'user',
            favoritos: []
          },
          userRole: 'user',
          loading: false
        });
      }
    },
    (error) => {
      console.error("❌ Error en listener userProfile:", error);
      set({ 
        userProfile: {
          email: userEmail,
          nombre: 'Usuario',
          rol: 'user',
          favoritos: []
        },
        userRole: 'user',
        loading: false
      });
    }
  );
};
