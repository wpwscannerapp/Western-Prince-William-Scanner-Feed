import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { validateEnv } from './config.ts'; // Import only validateEnv

// Validate environment variables on app startup
try {
  validateEnv();
} catch (error) {
  console.error('Environment variable validation failed:', error);
  document.getElementById("root")!.innerHTML = `
    <div style="min-height: 100vh; display: flex; flex-flex-direction: column; align-items: center; justify-content: center; background-color: #1a202c; color: #e2e8f0; padding: 1rem; text-align: center;">
      <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">Application Error</h1>
      <p style="font-size: 1.1rem;">${(error as Error).message}</p>
      <p style="font-size: 0.9rem; margin-top: 1rem;">Please check your browser console for more details.</p>
    </div>
  `;
  throw error;
}

createRoot(document.getElementById("root")!).render(
  // Removed React.StrictMode for development to prevent double-mounting issues
  <App />
);

// Register the service worker immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then((reg) => console.log('main.tsx: Service Worker registered:', reg.scope))
    .catch((err) => console.error('main.tsx: Service Worker registration failed:', err));
} else {
  console.warn('main.tsx: Service Workers are not supported by this browser.');
}