// Service Worker para Web Push Notifications
self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event sem dados');
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || data.mensagem || 'Nova notificação',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || data.link || '/',
        notificationId: data.id,
      },
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'close', title: 'Fechar' },
      ],
      tag: data.tag || 'hubfrete-notification',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || data.titulo || 'HubFrete', options)
    );
  } catch (error) {
    console.error('Erro ao processar push:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Tentar encontrar uma janela já aberta
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // Abrir nova janela se nenhuma estiver aberta
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notificação fechada:', event.notification.tag);
});
