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
  ];
  
  requiredEnvVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      throw new Error(`Environment variable ${varName} is missing. Please set it in your .env file.`);
    }
  });

  // Special handling for GOOGLE_MAPS_API_KEY as it's critical for TrafficPage
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
  console.log('DEBUG: VITE_GOOGLE_MAPS_API_KEY read from env:', GOOGLE_MAPS_API_KEY ? 'Set' : 'Missing/Empty'); // Added debug log
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.trim() === '') {
    throw new Error('Environment variable VITE_GOOGLE_MAPS_API_KEY is missing or empty. It is required for the Traffic page.');
  }

  const SPLASH_DURATION = parseInt(import.meta.env.VITE_SPLASH_DURATION as string, 10);
  const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL as string, 10);
  const SUPABASE_API_TIMEOUT = parseInt(import.meta.env.VITE_SUPABASE_API_TIMEOUT as string, 10);
  const MAX_CONCURRENT_SESSIONS = parseInt(import.meta.env.VITE_MAX_CONCURRENT_SESSIONS as string, 10);

  // Provide defaults if parsing fails, but after the initial check
  const finalSplashDuration = isNaN(SPLASH_DURATION) ? 3000 : SPLASH_DURATION;
  const finalPollInterval = isNaN(POLL_INTERVAL) ? 30000 : POLL_INTERVAL;
  const finalSupabaseApiTimeout = isNaN(SUPABASE_API_TIMEOUT) ? 10000 : SUPABASE_API_TIMEOUT;
  const finalMaxConcurrentSessions = isNaN(MAX_CONCURRENT_SESSIONS) ? 3 : MAX_CONCURRENT_SESSIONS;

  console.log('Loaded Env Vars:', {
    VITE_SPLASH_DURATION: finalSplashDuration,
    VITE_POLL_INTERVAL: finalPollInterval,
    VITE_SUPABASE_API_TIMEOUT: finalSupabaseApiTimeout,
    VITE_MAX_CONCURRENT_SESSIONS: finalMaxConcurrentSessions,
    VITE_GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY ? 'Set' : 'Missing', // This will now always say 'Set' if it passes the check
  });

  return { 
    SPLASH_DURATION: finalSplashDuration, 
    POLL_INTERVAL: finalPollInterval, 
    SUPABASE_API_TIMEOUT: finalSupabaseApiTimeout, 
    MAX_CONCURRENT_SESSIONS: finalMaxConcurrentSessions, 
    GOOGLE_MAPS_API_KEY 
  };
};

export const { SPLASH_DURATION, POLL_INTERVAL, SUPABASE_API_TIMEOUT, MAX_CONCURRENT_SESSIONS, GOOGLE_MAPS_API_KEY } = validateEnv();