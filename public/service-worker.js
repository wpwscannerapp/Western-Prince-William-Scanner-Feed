const CACHE_NAME = 'wpw-scanner-feed-cache-v9'; // Incremented cache version
const urlsToCache = [
  '/',
  '/index.html',
  '/Logo.png',
  '/manifest.json',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened, adding URLs to cache.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: All URLs added to cache. Skipping waiting.');
        self.skipWaiting(); // Activate new service worker immediately
      })
      .catch(error => {
        console.error('Service Worker: Cache installation failed:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Bypass service worker for Supabase API calls
  if (event.request.url.includes('supabase.co')) {
    // console.log('Service Worker: Bypassing cache for Supabase request:', event.request.url);
    event.respondWith(fetch(event.request));
    return;
  }

  // For navigation requests (e.g., loading an HTML page), try network first, then cache fallback
  if (event.request.mode === 'navigate') {
    // console.log('Service Worker: Handling navigation request:', event.request.url);
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            // console.log('Service Worker: Not caching invalid navigation response:', event.request.url, response?.status);
            return response;
          }
          // Cache the new page and return it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
            // console.log('Service Worker: Cached navigation response:', event.request.url);
          });
          return response;
        })
        .catch(() => {
          // console.log('Service Worker: Network failed for navigation, falling back to /index.html from cache.');
          return caches.match('/index.html');
        })
    );
    return;
  }

  // For other assets (JS, CSS, images, etc.), try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return cachedResponse;
        }
        // If not in cache, try fetching from the network
        return fetch(event.request).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            // console.log('Service Worker: Not caching invalid response:', event.request.url, response?.status);
            return response;
          }

          // IMPORTANT: Clone the response. A response is a stream
          // and because we want the browser to consume the response
          // as well as the cache consuming the response, we need
          // to clone it so we have two streams.
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
              // console.log('Service Worker: Fetched and cached:', event.request.url);
            });

          return response;
        }).catch(error => {
          console.error('Service Worker: Fetch failed for asset:', event.request.url, error);
          throw error;
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating new service worker:', CACHE_NAME);
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients.');
      self.clients.claim(); // Take control of all clients immediately
    })
    .catch(error => {
      console.error('Service Worker: Activation failed:', error);
    })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received.');
  const data = event.data?.json() || { title: 'New Update', body: 'Check out the latest scanner feed!' };
  const options = {
    body: data.body,
    data: {
      url: data.url || '/',
    },
    tag: 'scanner-update',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked.');
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});