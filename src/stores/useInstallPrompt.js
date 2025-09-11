// src/stores/useInstallPrompt.js
import { create } from 'zustand'

export const useInstallPrompt = create((set) => ({
  canInstall: false,
  deferred: null,
  setDeferred: (e) => set({ deferred: e, canInstall: !!e })
}))
