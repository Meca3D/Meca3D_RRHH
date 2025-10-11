// stores/authStore.js - AUTO-INICIALIZACIÓN
import { create } from 'zustand';
import { onAuthStateChanged,updatePassword,EmailAuthProvider,reauthenticateWithCredential,updateProfile,signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
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
    if (unsubscribeAuth) {
      return; 
    }

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        set({
          user,
          isAuthenticated: true,
          loading: true, // Still loading while user profile is fetched
        });
        // Cargar perfil
        loadUserProfileFunction(user.email, set); 
      } else {
        // No user, reset all states
        set({
          user: null,
          userRole: null,
          userProfile: null,
          isAuthenticated: false,
          loading: false, // Auth check complete, no user logged in
        });
        if (unsubscribeUserProfile) {
          unsubscribeUserProfile();
          unsubscribeUserProfile = null;
        }
        useHorasExtraStore.getState().clearHorasExtra();
        useNominaStore.getState().cleanup();
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
    
    getRol: (rol) => {
      const rolEsp={
           'user':'Empleado',
           'admin':'Administrador',
           'leaveAdmin':'Admin de Ausencias',
           'cocinero':'Admin de Desayunos',
           'owner':'Jefe'
      }    
      return rolEsp[rol];
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

    updateUserProfile: async (profileData) => {
    const { userProfile } = get();
    if (!userProfile?.email) throw new Error('No hay usuario autenticado');

    try {
      // Actualizar en Firestore
      const userRef = doc(db, 'USUARIOS', userProfile.email);
      await updateDoc(userRef, {
        nombre: profileData.nombre,
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

    setVisibility: async (visible) => {
      const { userProfile } = get();
      if (!userProfile?.email) throw new Error('No hay usuario autenticado');
      const userRef = doc(db, 'USUARIOS', userProfile.email);
      await updateDoc(userRef, { visible });
      set({ userProfile: { ...userProfile, visible } });
      return { success: true };
    },

    toggleVisibility: async () => {
      const current = get().userProfile?.visible;
      const next = current === false ? true : false;
      await get().setVisibility(next);
      return { success: true, visible: next };
    },

logout: async () => {

    await signOut(auth);
    if (unsubscribeAuth) {
      unsubscribeAuth();
      unsubscribeAuth = null;
    }
    if (unsubscribeUserProfile) {
      unsubscribeUserProfile();
      unsubscribeUserProfile = null;
    }

    // Resetear el estado del store después de un signOut exitoso
    set({
      user: null,
      userRole: null,
      userProfile: null,
      isAuthenticated: false,
      loading: false, // Ya no está cargando después del logout
    });
    useHorasExtraStore.getState().clearHorasExtra();
    useNominaStore.getState().cleanup();
    useOrdersStore.getState().clearOrders();
  },

  setUserProfile: (profile) => {
    set({ userProfile: { ...get().userProfile, ...profile } });
  },

    // Getters para roles
    isCocinero: () => get().userRole === 'cocinero',
    isLeaveAdmin: () => get().userRole === 'leaveAdmin',
    isOwner: () => get().userRole === 'owner',
    isAdmin: () => () => ['leaveAdmin', 'admin'].includes(get().userRole),
    isUser: () => get().userRole === 'user',
    canManageUsers: () => ['owner', 'admin'].includes(get().userRole),
    isAdminOrOwner: () => ['admin', 'owner', 'leaveAdmin'].includes(get().userRole),
  }));

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
            email: userEmail.toLowerCase(),
            nombre: userData.nombre,
            rol: userData.rol,
            fechaIngreso: userData.fechaIngreso,
            photoURL: userData.photoURL || null,
            favoritos: userData.favoritos || [],
            puesto: userData.puesto,
            nivel: userData.nivel,
            vacaDias: userData.vacaDias,
            vacaHoras: userData.vacaHoras,
            vacaciones:{
              disponibles: userData.vacaciones.disponibles || 0,
              pendientes: userData.vacaciones.pendientes ||0
            },
            configuracionNomina: userData.configuracionNomina,
            tarifasHorasExtra: userData.tarifasHorasExtra,
            visible: userData.visible !== false
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
            favoritos: [],
            visible: true
          },
          userRole: 'user',
          loading: false
        });
      }
    },
    (error) => {
      console.error("❌ AuthStore: Error en listener userProfile (Firestore error):", error);
      set({ 
        userProfile: {
          email: userEmail,
          nombre: 'Usuario',
          rol: 'user',
          favoritos: [],
          visible: true
        },
        userRole: 'user',
        loading: false
      });
    }
  );
};
