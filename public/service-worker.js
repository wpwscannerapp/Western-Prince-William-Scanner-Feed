const CACHE_NAME = 'wpw-scanner-feed-v1'; // Increment this version number when you make changes to cached assets

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/favicon.ico',
        '/Logo.png', // Pre-cache logo
        // Add other essential assets here if needed, e.g., main JS bundle path
        // Note: Vite generates hashed filenames, so direct caching of /src/main.tsx is not ideal.
        // The browser's default caching for the main bundle is usually sufficient.
      ]);
    })
  );
  self.skipWaiting();
});

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
      data: data.data, // Pass additional data for notificationclick
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/home'; // Use URL from data or default to /home
  event.waitUntil(clients.openWindow(urlToOpen));
});