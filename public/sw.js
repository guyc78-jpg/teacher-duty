// Service Worker — התראות דחיפה
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = { title: 'מערכת תורנויות', body: '', url: '/' };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://media.base44.com/images/public/6a60a8011c032f062c24d3ef/819298ab4_79E6BAA9-5D2A-4B7B-99A3-FF929A4428B9.png',
      badge: 'https://media.base44.com/images/public/6a60a8011c032f062c24d3ef/819298ab4_79E6BAA9-5D2A-4B7B-99A3-FF929A4428B9.png',
      dir: 'rtl',
      lang: 'he',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
