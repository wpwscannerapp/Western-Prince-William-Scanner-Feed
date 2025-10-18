console.log('TOP OF MAIN.TSX - TEST LOG'); // Added this as the very first line
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { validateEnv, SPLASH_DURATION, POLL_INTERVAL, SUPABASE_API_TIMEOUT, MAX_CONCURRENT_SESSIONS } from './config.ts'; // Import the validation function and constants

console.log('main.tsx: Application script started.');

// Validate environment variables on app startup
try {
  validateEnv();
  if (import.meta.env.DEV) {
    console.log('Loaded Env Vars from config.ts:', {
      SPLASH_DURATION: SPLASH_DURATION,
      POLL_INTERVAL: POLL_INTERVAL,
      SUPABASE_API_TIMEOUT: SUPABASE_API_TIMEOUT,
      MAX_CONCURRENT_SESSIONS: MAX_CONCURRENT_SESSIONS,
    });
    console.log('Raw VITE_SUPABASE_API_TIMEOUT from import.meta.env:', String(import.meta.env.VITE_SUPABASE_API_TIMEOUT));
    console.log('All import.meta.env variables:', import.meta.env);
  }
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
console.log('main.tsx: Checking for service worker support...');
if ('serviceWorker' in navigator) {
  console.log('main.tsx: Service Workers are supported. Attempting to register...');
  navigator.serviceWorker.register('/service-worker.js')
    .then((reg) => console.log('main.tsx: Service Worker registered:', reg.scope))
    .catch((err) => console.error('main.tsx: Service Worker registration failed:', err));
} else {
  console.warn('main.tsx: Service Workers are not supported by this browser.');
}