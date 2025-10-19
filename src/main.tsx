// Register the service worker immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then((reg) => console.log('main.tsx: Service Worker registered:', reg.scope))
    .catch((err) => console.error('main.tsx: Service Worker registration failed:', err));
} else {
  console.warn('main.tsx: Service Workers are not supported by this browser.');
}

import React from 'react';
import ReactDOM from 'react-dom/client';
// import App from './App'; // Temporarily commented out
import './globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
    {/* Temporarily render a simple div to check if React is rendering at all */}
    <div style={{ padding: '20px', textAlign: 'center', fontSize: '24px', color: 'white', backgroundColor: '#222' }}>
      Hello World!
    </div>
    </React.StrictMode>
);