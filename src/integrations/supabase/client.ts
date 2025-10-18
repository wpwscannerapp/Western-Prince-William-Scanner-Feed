import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseAnonKey.startsWith('eyJ')) {
  console.error('Invalid Supabase config—check .env', { supabaseUrl, supabaseAnonKey });
  throw new Error('Supabase configuration error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test on init
supabase.auth.getSession().then(({ error }) => {
  if (error) console.error('Supabase init failed:', error);
});