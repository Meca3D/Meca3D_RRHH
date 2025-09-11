// src/pwa.js
import { registerSW } from 'virtual:pwa-register'
import { useUIStore } from './stores/uiStore'

// Llama a initPWA() en src/main.jsx
export function initPWA() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      const { hideSnackbar } = useUIStore.getState()
      // Snackbar persistente con acción "Actualizar"
      useUIStore.setState({
        snackbar: {
          open: true,
          message: 'Nueva versión disponible',
          severity: 'info',
          actionText: 'Actualizar',
          // Ejecuta la actualización y cierra el aviso
          onAction: async () => {
            hideSnackbar()
            await updateSW(true)
          },
          persist: true
        }
      })
    },
    onOfflineReady() {
      // Aviso simple de offline listo
      useUIStore.getState().showSuccess?.('Listo para usar sin conexión')
    }
  })

  return updateSW
}
