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
        const deviceInfo = {
          token: token,
          device: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) 
            ? 'Mobile' 
            : 'Desktop',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Other',
          timestamp: new Date(),
          userAgent: navigator.userAgent
        };
        
        const userRef = doc(db, 'USUARIOS', userProfile.email);
        const userDoc = await getDoc(userRef);
        const existingTokens = userDoc.data()?.fcmTokens || [];
        
        // Verificar si el token ya existe (mismo dispositivo renovando)
        const tokenExists = existingTokens.find(t => t.token === token);
        
        if (!tokenExists) {
          // Agregar nuevo token al array
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(deviceInfo)
          });
        } else {
          // Actualizar timestamp del token existente
          const updatedTokens = existingTokens.map(t => 
            t.token === token ? { ...t, timestamp: new Date() } : t
          );
          await updateDoc(userRef, {
            fcmTokens: updatedTokens
          });
        }
        
        await updateNotificationPreference('granted');
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
      
      if (Notification.permission === 'granted') {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/icons/icon-192.png',
          data: payload.data
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return { permission, requestPermission };
};
