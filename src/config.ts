// config.ts
export const SPLASH_DURATION = parseInt(import.meta.env.VITE_SPLASH_DURATION as string, 10) || 3000;
export const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL as string, 10) || 30000;
export const SUPABASE_API_TIMEOUT = parseInt(import.meta.env.VITE_SUPABASE_API_TIMEOUT as string, 10) || 90000; // Increased to 90 seconds (90000 ms)
export const MAX_CONCURRENT_SESSIONS = parseInt(import.meta.env.VITE_MAX_CONCURRENT_SESSIONS as string, 10) || 3;
export const AUTH_INITIALIZATION_TIMEOUT = parseInt(import.meta.env.VITE_AUTH_INITIALIZATION_TIMEOUT as string, 10) || 20000; // New: Timeout for auth initialization

export const validateEnv = () => {
  const requiredEnvVars = [
    'VITE_SPLASH_DURATION',
    'VITE_POLL_INTERVAL',
    'VITE_SUPABASE_API_TIMEOUT',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_STRIPE_MONTHLY_PRICE_ID',
    'VITE_APP_URL',
    'VITE_MAX_CONCURRENT_SESSIONS',
    'VITE_WEB_PUSH_PUBLIC_KEY', // VAPID Public Key
    'VITE_AUTH_INITIALIZATION_TIMEOUT', // New: Auth initialization timeout
    'VITE_NETLIFY_SITE_ID', // Added Netlify Site ID
  ];

  requiredEnvVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      throw new Error(`Environment variable ${varName} is missing. Please set it in your .env file.`);
    }
  });

  if (import.meta.env.DEV) {
    console.log(`[Config] Resolved SUPABASE_API_TIMEOUT: ${SUPABASE_API_TIMEOUT}ms`);
  }
};