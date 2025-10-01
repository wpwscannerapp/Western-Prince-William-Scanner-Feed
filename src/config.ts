export const validateEnv = () => { // Added export keyword
  const requiredEnvVars = [
    'VITE_SPLASH_DURATION',
    'VITE_POLL_INTERVAL',
    'VITE_SUPABASE_API_TIMEOUT',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_WEB_PUSH_PUBLIC_KEY',
    'VITE_STRIPE_MONTHLY_PRICE_ID', // Added this as it's used in SubscriptionPage
    'VITE_APP_URL', // Added this as it's used in useAuth
  ];
  requiredEnvVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      console.warn(`${varName} is missing or invalid. Using default or throwing error.`);
    }
  });

  const SPLASH_DURATION = parseInt(import.meta.env.VITE_SPLASH_DURATION as string, 10) || 3000;
  const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL as string, 10) || 30000;
  const SUPABASE_API_TIMEOUT = parseInt(import.meta.env.VITE_SUPABASE_API_TIMEOUT as string, 10) || 10000;

  console.log('Loaded Env Vars:', {
    VITE_SPLASH_DURATION: SPLASH_DURATION,
    VITE_POLL_INTERVAL: POLL_INTERVAL,
    VITE_SUPABASE_API_TIMEOUT: SUPABASE_API_TIMEOUT,
  });

  return { SPLASH_DURATION, POLL_INTERVAL, SUPABASE_API_TIMEOUT };
};

export const { SPLASH_DURATION, POLL_INTERVAL, SUPABASE_API_TIMEOUT } = validateEnv();