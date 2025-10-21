const CACHE_NAME = 'wpw-scanner-feed-v6'; // Increment cache version

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
          .map((name) => {
            console.log('Service Worker: Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('Service Worker: All old caches cleared. Claiming clients.');
      self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // console.log('Service Worker: Fetching', event.request.url); // Too verbose, enable only for deep debugging
  event.respondWith(
    caches.match(event.request).then((response) => {
      // If a cached response is found, return it. Otherwise, fetch from network.
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEANUP_CACHE') {
    console.log('Service Worker: Received CLEANUP_CACHE message, keeping:', event.data.cacheName);
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((name) => {
        if (name !== event.data.cacheName) {
          console.log('Service Worker: Deleting cache via message:', name);
          caches.delete(name);
        }
      });
    });
  }
});