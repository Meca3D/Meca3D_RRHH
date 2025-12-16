import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
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

      let unsubscribe = null;

      const syncTokenIfGranted = async () => {
        try {
          if (Notification.permission !== 'granted') return;
          if (!userProfile?.email) return;

          const token = await getToken(messaging, { vapidKey });
          if (!token) return;

          // Info dispositivo/navegador (mismo enfoque que ya usas)
          const isRealMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
          const isMobileUA = /Mobile|Android|iPhone|iPod/.test(navigator.userAgent);
          const isTabletUA = /iPad|Tablet/.test(navigator.userAgent);

          let deviceType = 'Desktop';
          if (isTabletUA) deviceType = 'Tablet';
          else if (isRealMobile && isMobileUA) deviceType = 'Mobile';

          let browserName = 'Other';
          if (navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg')) browserName = 'Chrome';
          else if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) browserName = 'Safari';
          else if (navigator.userAgent.includes('Firefox')) browserName = 'Firefox';
          else if (navigator.userAgent.includes('Edg')) browserName = 'Edge';

          const deviceInfo = {
            token,
            device: deviceType,
            browser: browserName,
            timestamp: new Date(),
            userAgent: navigator.userAgent,
          };

          const userRef = doc(db, 'USUARIOS', userProfile.email);
          const userDoc = await getDoc(userRef);
          const existingTokens = userDoc.data()?.fcmTokens || [];

          const tokenIndex = existingTokens.findIndex(t => t.token === token);

          if (tokenIndex === -1) {
            await updateDoc(userRef, { fcmTokens: arrayUnion(deviceInfo) });
          } else {
            const updatedTokens = [...existingTokens];
            updatedTokens[tokenIndex] = { ...updatedTokens[tokenIndex], timestamp: new Date() };
            await updateDoc(userRef, { fcmTokens: updatedTokens });
          }

          await updateNotificationPreference('granted');

          // opcional: limpiar duplicados en otros usuarios
          try {
            await fetch('/.netlify/functions/cleanDuplicateTokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, currentUserEmail: userProfile.email }),
            });
          } catch (e) {
            console.warn('No se pudo limpiar tokens duplicados:', e);
          }
        } catch (e) {
          console.warn('No se pudo sincronizar token FCM:', e);
        }
      };

      // 1) Sync token si ya había permisos
      syncTokenIfGranted();
      
  unsubscribe = onMessage(messaging, async (payload) => {
    console.log('Mensaje recibido (foreground):', payload);

    if ('serviceWorker' in navigator && Notification.permission === 'granted' && payload.data) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        const notificationTitle = payload.data.title || 'Meca3D';
        const notificationOptions = {
          body: payload.data.body || 'Nueva notificación',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: payload.data,
          tag: payload.messageId || 'default',
          requireInteraction: false
        };

        await registration.showNotification(notificationTitle, notificationOptions);
      } catch (error) {
        console.error('Error mostrando notificación:', error);
      }
    }
  })

  return () => {if (unsubscribe) unsubscribe();}
  
}, [userProfile?.email]);



  return { permission, requestPermission };
};
