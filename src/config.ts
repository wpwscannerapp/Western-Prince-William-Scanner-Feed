import { SPLASH_DURATION_MS, POST_POLL_INTERVAL_MS, SUPABASE_API_TIMEOUT_MS } from './lib/constants';

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_MONTHLY_PRICE_ID',
  'VITE_APP_URL',
  'VITE_ADMIN_EMAIL',
  'VITE_WEB_PUSH_PUBLIC_KEY',
];

export const validateEnv = () => {
  let allGood = true;
  requiredEnvVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      console.error(`Missing environment variable: ${varName}. Please check your .env file.`);
      allGood = false;
    }
  });

  // Optional: Parse and validate numeric environment variables
  const splashDuration = parseInt(import.meta.env.VITE_SPLASH_DURATION || '', 10);
  if (isNaN(splashDuration) || splashDuration <= 0) {
    console.warn(`VITE_SPLASH_DURATION is missing or invalid. Using default: ${SPLASH_DURATION_MS}ms.`);
  }

  const pollInterval = parseInt(import.meta.env.VITE_POLL_INTERVAL || '', 10);
  if (isNaN(pollInterval) || pollInterval <= 0) {
    console.warn(`VITE_POLL_INTERVAL is missing or invalid. Using default: ${POST_POLL_INTERVAL_MS}ms.`);
  }

  const supabaseApiTimeout = parseInt(import.meta.env.VITE_SUPABASE_API_TIMEOUT || '', 10);
  if (isNaN(supabaseApiTimeout) || supabaseApiTimeout <= 0) {
    console.warn(`VITE_SUPABASE_API_TIMEOUT is missing or invalid. Using default: ${SUPABASE_API_TIMEOUT_MS}ms.`);
  }

  if (!allGood) {
    throw new Error('One or more required environment variables are missing. Please check console for details.');
  }
};