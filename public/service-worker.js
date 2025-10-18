self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'New Incident', body: 'Check the app!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.ico',
    })
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/home'));
});