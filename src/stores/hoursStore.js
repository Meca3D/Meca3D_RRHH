import { create } from 'zustand';

export const useHoursStore = create((set, get) => ({
  // Estado
  hoursEntries: [],
  currentMonthHours: 0,
  estimatedEarnings: 0,
  loading: false,
  error: null,

  // Acciones
  setHoursEntries: (entries) => set({ hoursEntries: entries }),
  
  addHourEntry: (entry) => set(state => ({
    hoursEntries: [...state.hoursEntries, entry]
  })),
  
  updateHourEntry: (id, updatedEntry) => set(state => ({
    hoursEntries: state.hoursEntries.map(entry => 
      entry.id === id ? { ...entry, ...updatedEntry } : entry
    )
  })),
  
  deleteHourEntry: (id) => set(state => ({
    hoursEntries: state.hoursEntries.filter(entry => entry.id !== id)
  })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Cálculos
  calculateMonthlyHours: () => {
    const { hoursEntries } = get();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyHours = hoursEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentMonth && 
               entryDate.getFullYear() === currentYear;
      })
      .reduce((total, entry) => total + entry.hours, 0);
    
    set({ currentMonthHours: monthlyHours });
    return monthlyHours;
  },

  calculateEstimatedEarnings: (hourlyRate) => {
    const { currentMonthHours } = get();
    const earnings = currentMonthHours * hourlyRate;
    set({ estimatedEarnings: earnings });
    return earnings;
  }
}));
