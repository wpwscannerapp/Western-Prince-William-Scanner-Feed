import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseAnonKey.startsWith('eyJ')) {
  console.error('Invalid Supabase env vars:', { supabaseUrl, supabaseAnonKey });
  throw new Error('Supabase configuration error');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

supabase.auth.getSession().then(({ error }) => {
  console.log(error ? `Supabase init failed: ${error.message}` : 'Supabase init passed');
});