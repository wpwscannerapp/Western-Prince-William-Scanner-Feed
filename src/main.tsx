import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// const CACHE_NAME = 'wpw-scanner-feed-v5'; // Increment to v5

// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', async () => {
//     console.log('main.tsx: Clearing existing service workers and caches.');
//     // Unregister all existing service workers
//     const registrations = await navigator.serviceWorker.getRegistrations();
//     for (const registration of registrations) {
//       await registration.unregister();
//       console.log('main.tsx: Unregistered service worker:', registration.scope);
//     }

//     // Clear all caches
//     const cacheNames = await caches.keys();
//     await Promise.all(cacheNames.map((name) => caches.delete(name)));
//     console.log('main.tsx: Cleared all caches.');

//     // Clear Supabase session storage
//     localStorage.removeItem('supabase.auth.token');
//     console.log('main.tsx: Cleared Supabase session storage.');

//     // Register new service worker
//     console.log('main.tsx: Registering service worker with cache-busting param.');
//     navigator.serviceWorker
//       .register('/service-worker.js?v=5')
//       .then((registration) => {
//         console.log('main.tsx: Service Worker registered:', registration.scope);
//         registration.active?.postMessage({ type: 'CLEANUP_CACHE', cacheName: CACHE_NAME });
//       })
//       .catch((error) => {
//         console.error('main.tsx: Service Worker registration failed:', error);
//       });
//   });
// }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);