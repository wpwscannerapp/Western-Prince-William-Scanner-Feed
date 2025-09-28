const CACHE_NAME = 'wpw-scanner-feed-cache-v2'; // Incremented cache version
const urlsToCache = [
  '/',
  '/index.html',
  '/placeholder.svg',
  '/manifest.json',
  '/favicon.ico'
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

  // For navigation requests (e.g., loading an HTML page), try network first, then cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the new page and return it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match('/index.html')) // Fallback to offline page
    );
    return;
  }

  // For other assets (JS, CSS, images, etc.), try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // If not in cache, try fetching from the network.
        // If network fetch fails, let the error propagate naturally.
        return fetch(event.request).catch((error) => {
          console.error('Fetch failed for asset:', event.request.url, error);
          // Do not return a custom Response with null body here;
          // let the browser handle the network error for the asset.
          throw error; // Re-throw to indicate fetch failure
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
    icon: '/icons/icon-192x192.png', // Using a generic icon from the icons folder
    badge: '/icons/icon-192x192.png', // Using a generic icon from the icons folder
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