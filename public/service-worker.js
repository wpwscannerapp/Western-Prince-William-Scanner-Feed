const CACHE_NAME = 'wpw-scanner-feed-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png',
  '/placeholder.svg',
  '/manifest.json',
  '/favicon.ico'
  // In a production build, you would typically cache your bundled JS and CSS files here.
  // For Vite, these often have hashes (e.g., /assets/index-XXXX.js, /assets/index-XXXX.css).
  // You might need a build step to dynamically generate this list or use a more advanced
  // service worker plugin for production. For development, these paths are less critical
  // as the browser usually fetches them directly.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Bypass service worker for Supabase API calls
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch((error) => {
          console.error('Fetch failed for:', event.request.url, error);
          // Fallback to index.html for navigation requests if offline
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // For other failed requests, return a generic error response or null
          return new Response(null, { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'New Update', body: 'Check out the latest scanner feed!' };
  const options = {
    body: data.body,
    icon: '/logo.png', // Your app icon
    badge: '/logo.png', // Badge icon
    data: {
      url: data.url || '/', // URL to open when notification is clicked
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});