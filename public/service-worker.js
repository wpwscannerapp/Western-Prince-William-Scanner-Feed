const CACHE_NAME = 'wpw-scanner-cache-v1'; // Increment this version number when you make changes to cached assets

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          // Delete old caches that don't match the current CACHE_NAME
          return cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim(); // Take control of all clients immediately
});
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