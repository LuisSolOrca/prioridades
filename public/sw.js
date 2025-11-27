// Service Worker para Push Notifications
// Este archivo debe estar en /public para tener el scope correcto

const CACHE_NAME = 'prioridades-app-v1';

// Evento de instalación
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker instalado');
  self.skipWaiting();
});

// Evento de activación
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activado');
  event.waitUntil(clients.claim());
});

// Evento de push - recibir notificaciones
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido:', event);

  let data = {
    title: 'Prioridades App',
    body: 'Tienes una nueva notificación',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload
      };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [100, 50, 100],
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Evento de click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event);

  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Determinar URL según el tipo de notificación
  if (data.url) {
    url = data.url;
  } else if (data.type) {
    switch (data.type) {
      case 'message':
        url = data.channelId ? `/channels/${data.channelId}` : '/channels';
        break;
      case 'priority':
        url = data.priorityId ? `/priorities?id=${data.priorityId}` : '/priorities';
        break;
      case 'task':
        url = '/tasks';
        break;
      case 'mention':
        url = data.channelId ? `/channels/${data.channelId}` : '/channels';
        break;
      case 'dynamic':
        url = data.channelId ? `/channels/${data.channelId}` : '/channels';
        break;
      default:
        url = '/dashboard';
    }
  }

  // Manejar acciones de botones
  if (event.action) {
    switch (event.action) {
      case 'view':
        // Usar la URL determinada
        break;
      case 'dismiss':
        return; // Solo cerrar
      case 'reply':
        // Podría abrir una UI de respuesta rápida
        break;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar si ya hay una ventana abierta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Si no hay ventana, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Evento de cierre de notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificación cerrada:', event.notification.tag);
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Mensaje recibido:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
