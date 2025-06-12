import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // Estado
  loading: false,
  snackbar: {
    open: false,
    message: '',
    severity: 'info'
  },
  drawer: {
    open: false
  },
  theme: 'light',
  bottomNavValue: 0,

  // Acciones
  setLoading: (loading) => set({ loading }),
  
  showSnackbar: (message, severity = 'info') => set({
    snackbar: { open: true, message, severity }
  }),
  
  hideSnackbar: () => set(state => ({
    snackbar: { ...state.snackbar, open: false }
  })),
  
  toggleDrawer: () => set(state => ({
    drawer: { open: !state.drawer.open }
  })),
  
  setDrawer: (open) => set({ drawer: { open } }),
  
  setTheme: (theme) => set({ theme }),
  
  setBottomNavValue: (value) => set({ bottomNavValue: value }),

  // Acciones de conveniencia
  showSuccess: (message) => get().showSnackbar(message, 'success'),
  showError: (message) => get().showSnackbar(message, 'error'),
  showWarning: (message) => get().showSnackbar(message, 'warning'),
  showInfo: (message) => get().showSnackbar(message, 'info'),
}));
