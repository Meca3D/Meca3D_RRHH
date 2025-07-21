// stores/authStore.js - AUTO-INICIALIZACIÓN
import { create } from 'zustand';
import { onAuthStateChanged,updatePassword,EmailAuthProvider,reauthenticateWithCredential,updateProfile,signOut } from 'firebase/auth';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useNominaStore } from './nominaStore';
import { useHorasExtraStore } from './horasExtraStore';
import { useOrdersStore } from './ordersStore';

let unsubscribeAuth = null;
let unsubscribeUserProfile = null;

export const useAuthStore = create((set, get) => ({
  // Estado inicial
  user: null,
  userRole: null,
  userProfile: null,
  loading: true, // Start as true to indicate initial auth check is in progress
  isAuthenticated: false,

  // Function to initialize the auth listener (called once, likely in App.jsx or main entry)
  // This ensures the listener is set up correctly when the app loads
 initAuthListener: () => {
    console.log("AuthStore: initAuthListener called.");
    if (unsubscribeAuth) {
      console.log("AuthStore: Existing auth listener found, returning.");
      return; 
    }

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("AuthStore: onAuthStateChanged fired. User:", user ? user.email : 'null');
      if (user) {
        set({
          user,
          isAuthenticated: true,
          loading: true, // Still loading while user profile is fetched
        });
        // Cargar perfil
        console.log("AuthStore: User authenticated, loading profile for:", user.email);
        loadUserProfileFunction(user.email, set); 
      } else {
        // No user, reset all states
        console.log("AuthStore: No user authenticated, resetting state.");
        set({
          user: null,
          userRole: null,
          userProfile: null,
          isAuthenticated: false,
          loading: false, // Auth check complete, no user logged in
        });
        if (unsubscribeUserProfile) {
          console.log("AuthStore: Unsubscribing user profile listener on logout.");
          unsubscribeUserProfile();
          unsubscribeUserProfile = null;
        }
        useHorasExtraStore.getState().clearHorasExtra();
        useNominaStore.getState().cleanup();
        console.log("AuthStore: Called cleanup on other stores.");
      }
    });
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

    updateUserProfile: async (profileData) => {
    const { userProfile } = get();
    if (!userProfile?.email) throw new Error('No hay usuario autenticado');

    try {
      // Actualizar en Firestore
      const userRef = doc(db, 'USUARIOS', userProfile.email);
      await updateDoc(userRef, {
        nombre: profileData.nombre,
        puesto: profileData.puesto,
        nivel: profileData.nivel,
        fechaIngreso: profileData.fechaIngreso,
        photoURL: profileData.photoURL
      });

      // Actualizar en Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: profileData.nombre,
        photoURL: profileData.photoURL
      });

      // Actualizar estado local
      set({
        userProfile: {
          ...userProfile,
          ...profileData
        }
      });

      return { success: true, message: 'Perfil actualizado correctamente' };
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  },


  changePassword: async (currentPassword, newPassword) => {
    const { userProfile } = get();
    if (!userProfile?.email) throw new Error('No hay usuario autenticado');

    try {
      // Reautenticar usuario
      const credential = EmailAuthProvider.credential(userProfile.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Cambiar contraseña
      await updatePassword(auth.currentUser, newPassword);
      
      return { success: true, message: 'Contraseña actualizada correctamente' };
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      throw error;
    }
  },

logout: async () => {
    console.log("AuthStore: Initiating logout process.");
    // Asegurarse de que Firebase signOut ocurra primero
    await signOut(auth);
    console.log("AuthStore: Firebase signOut completed.");

    // Desuscribir el listener de autenticación *después* de signOut
    // Esto asegura que onAuthStateChanged tenga la oportunidad de dispararse con user: null
    if (unsubscribeAuth) {
      unsubscribeAuth();
      unsubscribeAuth = null;
      console.log("AuthStore: Auth listener unsubscribed after signOut.");
    }
    if (unsubscribeUserProfile) {
      unsubscribeUserProfile();
      unsubscribeUserProfile = null;
      console.log("AuthStore: User profile listener unsubscribed after signOut.");
    }

    // Resetear el estado del store después de un signOut exitoso
    set({
      user: null,
      userRole: null,
      userProfile: null,
      isAuthenticated: false,
      loading: false, // Ya no está cargando después del logout
    });
    console.log("AuthStore: State reset after logout.");
    useHorasExtraStore.getState().clearHorasExtra();
    useNominaStore.getState().cleanup();
    useOrdersStore.getState().clearOrders();
    console.log("AuthStore: Called cleanup on other stores during explicit logout.");
  },

  setUserProfile: (profile) => {
    set({ userProfile: { ...get().userProfile, ...profile } });
        console.log("AuthStore: setUserProfile called.");
  },

    // Getters para roles
    isOwner: () => get().userRole === 'owner',
    isAdmin: () => get().userRole === 'admin',
    isUser: () => get().userRole === 'user',
    canManageUsers: () => ['owner', 'admin'].includes(get().userRole),
    isAdminOrOwner: () => ['admin', 'owner'].includes(get().userRole),
  }));

const loadUserProfileFunction = (userEmail, set) => {
  console.log("AuthStore: loadUserProfileFunction called for:", userEmail);
  if (unsubscribeUserProfile) {
    unsubscribeUserProfile();
    console.log("AuthStore: Unsubscribed previous user profile listener in loadUserProfileFunction.");
 
  }

  unsubscribeUserProfile = onSnapshot(
    doc(db, 'USUARIOS', userEmail),
    (docSnap) => {
      console.log("AuthStore: onSnapshot callback fired for user profile.");
      if (docSnap.exists()) {
        const userData = docSnap.data();
        console.log("AuthStore: User profile document exists. Data:", userData);
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
        console.log("AuthStore: User profile loaded and state updated. Loading: false.");
      } else {
        console.warn("AuthStore: User profile document does NOT exist for:", userEmail);
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
        console.log("AuthStore: User profile not found, default state set. Loading: false.");
      }
    },
    (error) => {
      console.error("❌ AuthStore: Error en listener userProfile (Firestore error):", error);
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
      console.log("AuthStore: Error loading user profile, default state set. Loading: false.");
    }
  );
};
