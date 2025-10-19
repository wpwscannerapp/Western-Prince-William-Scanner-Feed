// Register the service worker immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then((reg) => console.log('main.tsx: Service Worker registered:', reg.scope))
    .catch((err) => console.error('main.tsx: Service Worker registration failed:', err));
} else {
  console.warn('main.tsx: Service Workers are not supported by this browser.');
}