/* eslint-env serviceworker */
/* global firebase, clients, self */

// Importar Firebase compat
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

// Inicializar Firebase
firebase.initializeApp({
  apiKey: "AIzaSyDDLCk8bc1veL5mxRXDuItbtJUhMiOnthc",
  authDomain: "meca3drrhh-6281b.firebaseapp.com",
  projectId: "meca3drrhh-6281b",
  storageBucket: "meca3drrhh-6281b.firebasestorage.app",
  messagingSenderId: "832898290332",
  appId: "1:832898290332:web:a7ef936a4ff742a778d359"
});

const messaging = firebase.messaging();

// Manejar mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Mensaje recibido en background:', payload);
  
  const notificationTitle = payload.data?.title || 'Meca3D';
  const notificationOptions = {
    body: payload.data?.body || 'Nueva notificación',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log('[SW] Firebase Messaging Service Worker cargado');

self.addEventListener('activate', event => {
  console.log('[SW] Service Worker activado');
});

self.addEventListener('push', event => {
  console.log('[SW] Push recibido:', event);
});

