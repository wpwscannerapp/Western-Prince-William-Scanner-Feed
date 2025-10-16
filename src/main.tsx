import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { validateEnv, SPLASH_DURATION, POLL_INTERVAL, SUPABASE_API_TIMEOUT, MAX_CONCURRENT_SESSIONS } from './config.ts'; // Import the validation function and constants

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
    console.log('Raw VITE_SUPABASE_API_TIMEOUT from import.meta.env:', import.meta.env.VITE_SUPABASE_API_TIMEOUT);
  }
} catch (error) {
  console.error('Environment variable validation failed:', error);
  // Optionally, render an error message to the user or halt the app
  document.getElementById("root")!.innerHTML = `
    <div style="min-height: 100vh; display: flex; flex-flex-direction: column; align-items: center; justify-content: center; background-color: #1a202c; color: #e2e8f0; padding: 1rem; text-align: center;">
      <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">Application Error</h1>
      <p style="font-size: 1.1rem;">${(error as Error).message}</p>
      <p style="font-size: 0.9rem; margin-top: 1rem;">Please check your browser console for more details.</p>
    </div>
  `;
  throw error; // Stop further execution if critical env vars are missing
}

createRoot(document.getElementById("root")!).render(<App />);