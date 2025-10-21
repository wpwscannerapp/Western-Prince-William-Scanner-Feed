import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseAnonKey.startsWith('eyJ')) {
  console.error('Invalid Supabase config—check .env', { supabaseUrl, supabaseAnonKey });
  throw new Error('Supabase configuration error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
});

// Only log full anon key in development
if (import.meta.env.DEV) {
  console.log('Supabase Client Init: Using URL:', supabaseUrl);
  console.log('Supabase Client Init: Using Anon Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');
  console.log('Supabase Client Object:', supabase); // <-- NEW LOG
  supabase.auth.getSession().then(({ error }) => {
    if (error) {
      console.error(`Supabase Auth Init Failed: ${error.message}`);
    } else {
      console.log('Supabase Auth Init Passed');
    }
  });
}