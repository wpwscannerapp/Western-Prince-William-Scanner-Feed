const CACHE_NAME = 'wpw-scanner-feed-v8'; // Increment cache version for new strategy
const FILES_TO_CACHE = [
  '/', // Cache the root HTML
  '/index.html',
  '/Logo.png', // Pre-cache logo
  '/manifest.json',
  // Note: Vite generates hashed filenames for JS/CSS, so we can't hardcode them here.
  // The fetch strategy below will handle caching these dynamically.
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Pre-caching shell assets');
      return cache.addAll(FILES_TO_CACHE);
    }).then(() => self.skipWaiting()) // Activate new service worker immediately
  );
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
  const requestUrl = new URL(event.request.url);

  // For all requests: Network-first, then cache
  event.respondWith(
    fetch(event.request)
      .then(async (networkResponse) => {
        // If we get a valid network response, cache it and return it
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(async () => {
        // If network fails, try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback for offline if both network and cache fail
        return new Response('Offline content not available', { status: 503, statusText: 'Service Unavailable' });
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