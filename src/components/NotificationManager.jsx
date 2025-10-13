import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { NotificationPrompt } from './NotificationPrompt';

export const NotificationManager = () => {
  const { 
    userProfile, 
    loading, 
    isAuthenticated,
    notificationPromptShown,
    setNotificationPromptShown 
  } = useAuthStore();
  
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const checkNotificationStatus = async () => {
      // Solo proceder si está autenticado y cargado
      if (!isAuthenticated || !userProfile || loading || notificationPromptShown) {
        return;
      }

      // Verificar permiso del NAVEGADOR ACTUAL (no Firestore)
      const browserPermission = Notification.permission;

      // Si el navegador actual ya concedió permisos, no mostrar
      if (browserPermission === 'granted') {
        return;
      }

      // Si el navegador actual denegó permisos, no molestar
      if (browserPermission === 'denied') {
        return;
      }

      // browserPermission === 'default' (nunca preguntado en este navegador)
      // Verificar si el usuario rechazó globalmente en otro dispositivo
      if (userProfile.notificationPreference === 'declined') {
        return; // Respetamos su decisión de no querer notificaciones
      }

      // Mostrar prompt si:
      // 1. Navegador nunca preguntó ('default')
      // 2. Usuario no rechazó globalmente
      const timer = setTimeout(() => {
        setShowPrompt(true);
        setNotificationPromptShown(true);
      }, 3000);

      return () => clearTimeout(timer);
    };

    checkNotificationStatus();
  }, [isAuthenticated, userProfile, loading, notificationPromptShown]);

  const handleClose = (accepted) => {
    setShowPrompt(false);
  };

  return <NotificationPrompt open={showPrompt} onClose={handleClose} />;
};
