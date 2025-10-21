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
      })
      .catch((error) => {
        console.error('main.tsx: Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);