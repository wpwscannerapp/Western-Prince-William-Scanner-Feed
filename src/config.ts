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
    'VITE_TOMTOM_API_KEY',
    'VITE_ONESIGNAL_APP_ID',
    // 'VITE_ONESIGNAL_SAFARI_WEB_ID', // Made optional
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

  const finalSplashDuration = isNaN(SPLASH_DURATION) ? 3000 : SPLASH_DURATION;
  const finalPollInterval = isNaN(POLL_INTERVAL) ? 30000 : POLL_INTERVAL;
  const finalSupabaseApiTimeout = isNaN(SUPABASE_API_TIMEOUT) ? 10000 : SUPABASE_API_TIMEOUT;
  const finalMaxConcurrentSessions = isNaN(MAX_CONCURRENT_SESSIONS) ? 3 : MAX_CONCURRENT_SESSIONS;

  console.log('Loaded Env Vars:', {
    VITE_SPLASH_DURATION: finalSplashDuration,
    VITE_POLL_INTERVAL: finalPollInterval,
    VITE_SUPABASE_API_TIMEOUT: finalSupabaseApiTimeout,
    VITE_MAX_CONCURRENT_SESSIONS: finalMaxConcurrentSessions,
  });

  return {
    SPLASH_DURATION: finalSplashDuration,
    POLL_INTERVAL: finalPollInterval,
    SUPABASE_API_TIMEOUT: finalSupabaseApiTimeout,
    MAX_CONCURRENT_SESSIONS: finalMaxConcurrentSessions,
  };
};

export const { SPLASH_DURATION, POLL_INTERVAL, SUPABASE_API_TIMEOUT, MAX_CONCURRENT_SESSIONS } = validateEnv();