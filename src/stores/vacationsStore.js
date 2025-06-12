import { create } from 'zustand';

export const useVacationsStore = create((set, get) => ({
  // Estado
  vacationRequests: [],
  availableDays: 0,
  usedDays: 0,
  pendingRequests: [],
  loading: false,
  error: null,

  // Acciones
  setVacationRequests: (requests) => set({ vacationRequests: requests }),
  
  addVacationRequest: (request) => set(state => ({
    vacationRequests: [...state.vacationRequests, request]
  })),
  
  updateVacationRequest: (id, updatedRequest) => set(state => ({
    vacationRequests: state.vacationRequests.map(request => 
      request.id === id ? { ...request, ...updatedRequest } : request
    )
  })),

  setAvailableDays: (days) => set({ availableDays: days }),
  setUsedDays: (days) => set({ usedDays: days }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Getters
  getRemainingDays: () => {
    const { availableDays, usedDays } = get();
    return availableDays - usedDays;
  },

  getPendingRequests: () => {
    const { vacationRequests } = get();
    return vacationRequests.filter(request => request.status === 'pending');
  },

  getApprovedRequests: () => {
    const { vacationRequests } = get();
    return vacationRequests.filter(request => request.status === 'approved');
  }
}));
