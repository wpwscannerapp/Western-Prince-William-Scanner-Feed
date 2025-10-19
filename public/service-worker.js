const CACHE_NAME = 'wpw-scanner-feed-v5'; // Increment to v5

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing', CACHE_NAME);
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEANUP_CACHE') {
    console.log('Service Worker: Cleaning up old caches, keeping:', event.data.cacheName);
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((name) => {
        if (name !== event.data.cacheName) {
          caches.delete(name);
        }
      });
    });
  }
});