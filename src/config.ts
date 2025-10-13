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
    'VITE_MAX_CONCURRENT_SESSIONS', // Added for concurrent login limit
    'VITE_AUTH_INITIALIZATION_TIMEOUT', // New: Timeout for auth loading
    'VITE_TOMTOM_API_KEY', // New: TomTom API Key
  ];
  
  requiredEnvVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      throw new Error(`Environment variable ${varName} is missing. Please set it in your .env file.`);
    }
  });

  const SPLASH_DURATION = parseInt(import.meta.env.VITE_SPLASH_DURATION as string, 10);
  const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL as string, 10);
  const SUPABASE_API_TIMEOUT = parseInt(import.meta.env.VITE_SUPABASE_API_TIMEOUT as string, 10);
  const MAX_CONCURRENT_SESSIONS = parseInt(import.meta.env.VITE_MAX_CONCURRENT_SESSIONS as string, 10);
  const AUTH_INITIALIZATION_TIMEOUT = parseInt(import.meta.env.VITE_AUTH_INITIALIZATION_TIMEOUT as string, 10); // New

  // Provide defaults if parsing fails, but after the initial check
  const finalSplashDuration = isNaN(SPLASH_DURATION) ? 3000 : SPLASH_DURATION;
  const finalPollInterval = isNaN(POLL_INTERVAL) ? 30000 : POLL_INTERVAL;
  const finalSupabaseApiTimeout = isNaN(SUPABASE_API_TIMEOUT) ? 10000 : SUPABASE_API_TIMEOUT;
  const finalMaxConcurrentSessions = isNaN(MAX_CONCURRENT_SESSIONS) ? 3 : MAX_CONCURRENT_SESSIONS;
  const finalAuthInitializationTimeout = isNaN(AUTH_INITIALIZATION_TIMEOUT) ? 5000 : AUTH_INITIALIZATION_TIMEOUT; // Default to 5 seconds

  console.log('Loaded Env Vars:', {
    VITE_SPLASH_DURATION: finalSplashDuration,
    VITE_POLL_INTERVAL: finalPollInterval,
    VITE_SUPABASE_API_TIMEOUT: finalSupabaseApiTimeout,
    VITE_MAX_CONCURRENT_SESSIONS: finalMaxConcurrentSessions,
    VITE_AUTH_INITIALIZATION_TIMEOUT: finalAuthInitializationTimeout, // New
  });

  return { 
    SPLASH_DURATION: finalSplashDuration, 
    POLL_INTERVAL: finalPollInterval, 
    SUPABASE_API_TIMEOUT: finalSupabaseApiTimeout, 
    MAX_CONCURRENT_SESSIONS: finalMaxConcurrentSessions, 
    AUTH_INITIALIZATION_TIMEOUT: finalAuthInitializationTimeout, // New
  };
};

export const { SPLASH_DURATION, POLL_INTERVAL, SUPABASE_API_TIMEOUT, MAX_CONCURRENT_SESSIONS, AUTH_INITIALIZATION_TIMEOUT } = validateEnv();