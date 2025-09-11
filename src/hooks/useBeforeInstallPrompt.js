// src/hooks/useBeforeInstallPrompt.js
import { useEffect } from 'react'
import { useInstallPrompt } from '../stores/useInstallPrompt.js'

export function useBeforeInstallPrompt() {
  const setDeferred = useInstallPrompt((s) => s.setDeferred)

  useEffect(() => {
    const onBIP = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    return () => window.removeEventListener('beforeinstallprompt', onBIP)
  }, [setDeferred])
}