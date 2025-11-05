console.log('main.tsx: File loaded — starting app');
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'leaflet/dist/leaflet.css'; // Added Leaflet CSS import
import { validateEnv } from './config'; // Import validateEnv
import { unregisterServiceWorkerInDev } from './utils/serviceWorkerHelper'; // Import unregister utility

console.log('main.tsx: Imports done');

// Declare window.import for TypeScript compatibility
declare global {
  interface Window {
    import: (url: string) => Promise<any>;
  }
}

// Log all dynamic imports to console for debugging the 'c is not a function' error
if (import.meta.env.DEV) {
  const origImport = window.import;
  window.import = (url: string) => {
    console.log('Dynamic import:', url);
    return origImport.call(window, url);
  };
}

// Call validateEnv early in the application lifecycle
validateEnv();

// Attempt to unregister service worker in development to prevent stale cache issues
if (import.meta.env.DEV) {
  unregisterServiceWorkerInDev();
}

console.log('main.tsx: About to createRoot');
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  import.meta.env.DEV ? (
    <App />
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
);
console.log('main.tsx: App rendered');