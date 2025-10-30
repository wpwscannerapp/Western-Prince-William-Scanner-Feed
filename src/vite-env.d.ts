/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPLASH_DURATION: string;
  readonly VITE_POLL_INTERVAL: string;
  readonly VITE_SUPABASE_API_TIMEOUT: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_MONTHLY_PRICE_ID: string;
  readonly VITE_APP_URL: string;
  readonly VITE_MAX_CONCURRENT_SESSIONS: string;
  readonly VITE_WEB_PUSH_PUBLIC_KEY: string;
  readonly VITE_AUTH_INITIALIZATION_TIMEOUT: string;
  readonly VITE_STRIPE_PRICE: string;
  readonly VITE_NETLIFY_SITE_ID: string; // Added Netlify Site ID
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}