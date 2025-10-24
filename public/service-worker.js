const CACHE_NAME = 'wpw-scanner-feed-v9'; // Increment cache version again for new strategy
const FILES_TO_CACHE = [
  '/Logo.png', // Pre-cache logo
  '/manifest.json',
  // index.html and / will be handled with a network-only strategy
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Pre-caching shell assets (excluding index.html)');
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

  // Strategy for index.html and root path: Network-only (or network-first with cache fallback)
  // Always try network first for the main HTML file to ensure latest version.
  if (requestUrl.pathname === '/' || requestUrl.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then(async (networkResponse) => {
          // If network is successful, cache it for potential offline use and return
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(async () => {
          // If network fails (e.g., offline), try to serve from cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback for offline if both network and cache fail
          return new Response('Offline content not available', { status: 503, statusText: 'Service Unavailable' });
        })
    );
    return; // Stop processing further for index.html
  }

  // For all other assets (JS, CSS, images, etc.): Network-first, then cache
  event.respondWith(
    fetch(event.request)
      .then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response('Offline content not available', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Received SKIP_WAITING message. Skipping waiting.');
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLAIM_CLIENTS') {
    console.log('Service Worker: Received CLAIM_CLIENTS message. Claiming clients.');
    self.clients.claim();
  }
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