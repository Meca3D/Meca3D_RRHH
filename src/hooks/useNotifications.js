import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, getDoc, getDocs } from 'firebase/firestore';
import { messaging, vapidKey, db } from '../firebase/config';
import { useAuthStore } from '../stores/authStore';

export const useNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const { userProfile, updateNotificationPreference } = useAuthStore();

const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    setPermission(permission);
    
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey });
      
      if (token && userProfile?.email) {
        // Obtener info del dispositivo
        // Detectar si realmente es móvil (tiene touch) o solo está en modo responsive de DevTools
        const isRealMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isMobileUA = /Mobile|Android|iPhone|iPod/.test(navigator.userAgent);
        const isTabletUA = /iPad|Tablet/.test(navigator.userAgent);

        // Determinar tipo de dispositivo
        let deviceType = 'Desktop';
        if (isTabletUA) {
          deviceType = 'Tablet';
        } else if (isRealMobile && isMobileUA) {
          deviceType = 'Mobile';
        }

        // Detectar navegador
        let browserName = 'Other';
        if (navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg')) {
          browserName = 'Chrome';
        } else if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
          browserName = 'Safari';
        } else if (navigator.userAgent.includes('Firefox')) {
          browserName = 'Firefox';
        } else if (navigator.userAgent.includes('Edg')) {
          browserName = 'Edge';
        }

        const deviceInfo = {
          token: token,
          device: deviceType,
          browser: browserName,
          timestamp: new Date(),
          userAgent: navigator.userAgent
        };

        
        const userRef = doc(db, 'USUARIOS', userProfile.email);
        const userDoc = await getDoc(userRef);
        const existingTokens = userDoc.data()?.fcmTokens || [];
        
        // Verificar si el token ya existe en este usuario
        const tokenIndex = existingTokens.findIndex(t => t.token === token);
        
        if (tokenIndex === -1) {
          // Token nuevo, agregarlo
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(deviceInfo)
          });
        } else {
          // Token existente, actualizar timestamp
          const updatedTokens = [...existingTokens];
          updatedTokens[tokenIndex] = {
            ...updatedTokens[tokenIndex],
            timestamp: new Date()
          };
          await updateDoc(userRef, {
            fcmTokens: updatedTokens
          });
        }
        
        // Después de guardar el token
        await updateNotificationPreference('granted');

        // Limpiar tokens duplicados en otros usuarios (backend)
        try {
          await fetch('/.netlify/functions/cleanDuplicateTokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: token,
              currentUserEmail: userProfile.email
            })
          });
        } catch (error) {
          console.warn('No se pudo limpiar tokens duplicados:', error);
        }

        console.log('Token FCM guardado:', token);
        return token;
              }
    } else if (permission === 'denied') {
      await updateNotificationPreference('denied');
    }
  } catch (error) {
    console.error('Error al solicitar permisos:', error);
    throw error;
  }
};



useEffect(() => {
  if (!messaging) return;

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Mensaje recibido (foreground):', payload);
    
    // ✅ Mostrar notificación cuando la app está abierta
    if (Notification.permission === 'granted' && payload.data) {
      const notificationTitle = payload.data.title || 'Meca3D';
      const notificationOptions = {
        body: payload.data.body || 'Nueva notificación',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: payload.data,
        tag: payload.messageId || 'default', // Evita duplicados
        requireInteraction: false
      };

      // Crear notificación del navegador
      const notification = new Notification(notificationTitle, notificationOptions);
      
      // Manejar clic en la notificación
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        const url = payload.data.url || '/';
        if (window.location.pathname !== url) {
          window.location.href = url;
        }
      };
    }
  });

  return () => unsubscribe();
}, []);


  return { permission, requestPermission };
};
