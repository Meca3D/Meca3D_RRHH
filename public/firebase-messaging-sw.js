// public/firebase-messaging-sw.js

// Importar las versiones compat de Firebase para Service Workers
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

// Inicializar Firebase (con tus claves reales, NO variables de entorno)
firebase.initializeApp({
  apiKey: "AIzaSyDDLCk8bc1veL5mxRXDuItbtJUhMiOntHc",
  authDomain: "meca3drrhh-6281b.firebaseapp.com",
  projectId: "meca3drrhh-6281b",
  storageBucket: "meca3drrhh-6281b.firebasestorage.app",
  messagingSenderId: "832898290332",
  appId: "1:832898290332:web:a7ef936a4ff742a778d359"
});

// Obtener instancia de messaging
const messaging = firebase.messaging();

// Manejar mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('Mensaje recibido en segundo plano:', payload);
  
  const notificationTitle = payload.data?.title || 'Meca3D';
  const notificationOptions = {
    body: payload.data?.body || 'Nueva notificación',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notificación clickeada:', event);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si la app ya está abierta, enfocarse en ella
        for (let client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no está abierta, abrirla
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
