'use strict';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let datos = { title: '🔔 Timbre', body: 'Alguien tocó el timbre.' };

  if (event.data) {
    try {
      datos = event.data.json();
    } catch (err) {
      datos.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(datos.title || '🔔 Timbre', {
      body: datos.body || 'Alguien tocó el timbre.',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((listaClientes) => {
      for (const cliente of listaClientes) {
        if ('focus' in cliente) return cliente.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
