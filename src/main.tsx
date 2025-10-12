import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { validateEnv } from './config.ts'; // Import the validation function

// DEBUG: Log VITE_GOOGLE_MAPS_API_KEY directly from import.meta.env before validation
console.log('Main.tsx Debug: VITE_GOOGLE_MAPS_API_KEY raw value:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

// Validate environment variables on app startup
try {
  validateEnv();
} catch (error) {
  console.error('Environment variable validation failed:', error);
  // Optionally, render an error message to the user or halt the app
  document.getElementById("root")!.innerHTML = `
    <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #1a202c; color: #e2e8f0; padding: 1rem; text-align: center;">
      <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">Application Error</h1>
      <p style="font-size: 1.1rem;">${(error as Error).message}</p>
      <p style="font-size: 0.9rem; margin-top: 1rem;">Please check your browser console for more details.</p>
    </div>
  `;
  throw error; // Stop further execution if critical env vars are missing
}


// Register the service worker only in production
if (import.meta.env.PROD) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);