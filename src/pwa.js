// src/pwa.js
import { registerSW } from 'virtual:pwa-register'
import { useUIStore } from './stores/uiStore'

// Solo necesitas esto si usas injectRegister: 'none'
// Con injectRegister: 'auto', esto es opcional
export function initPWA() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('Nueva versión disponible')
      const { showActionSnackbar, hideSnackbar } = useUIStore.getState()
      
      showActionSnackbar(
        'Nueva versión disponible',
        'Actualizar',
        async () => {
          hideSnackbar()
          await updateSW(true)
        },
        'info',
        true
      )
    },
    onOfflineReady() {
      console.log('App lista para funcionar offline')
      useUIStore.getState().showSuccess('Listo para usar sin conexión')
    },
    onRegistered(registration) {
      console.log('Service Worker registrado:', registration)
    },
    onRegisterError(error) {
      console.error('Error al registrar Service Worker:', error)
    }
  })

  return updateSW
}