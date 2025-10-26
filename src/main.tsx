import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// The service worker registration is now handled by vite-plugin-pwa.
// This block is removed to prevent conflicts and redundant registrations.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);