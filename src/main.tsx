import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('main.tsx: Registering service worker.');
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('main.tsx: Service Worker registered:', registration.scope);

        // Add logic to handle updates immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is installed and ready to activate
                console.log('main.tsx: New service worker installed, skipping waiting.');
                newWorker.postMessage({ type: 'SKIP_WAITING' }); // Tell new worker to skip waiting
              }
            });
          }
        });

        // Ensure the active service worker takes control immediately
        if (navigator.serviceWorker.controller) {
          console.log('main.tsx: Service Worker already active, claiming clients.');
          navigator.serviceWorker.controller.postMessage({ type: 'CLAIM_CLIENTS' });
        }
      })
      .catch((error) => {
        console.error('main.tsx: Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode> {/* Re-enabled StrictMode */}
    <App />
  </React.StrictMode>
);