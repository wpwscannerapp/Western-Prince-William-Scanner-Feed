import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseAnonKey.startsWith('eyJ')) {
  console.error('Invalid Supabase config—check .env', { supabaseUrl, supabaseAnonKey });
  throw new Error('Supabase configuration error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid.');
}

if (import.meta.env.DEV) {
  console.log('Supabase Client Init: Using URL:', supabaseUrl);
  console.log('Supabase Client Init: Using Full Anon Key (DEV ONLY):', supabaseAnonKey);
} else {
  console.log('Supabase Client Init: Using Anon Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test on init
supabase.auth.getSession().then(({ error }) => {
  if (import.meta.env.DEV) {
    console.log(error ? `Supabase Auth Init Failed: ${error.message}` : 'Supabase Auth Init Passed');
  }
});

// Add a test for public database access
supabase.from('app_settings').select('id').limit(1).then(({ error }) => {
  if (import.meta.env.DEV) {
    if (error) {
      console.error(`Supabase DB Access Test Failed: ${error.message}`);
    } else {
      console.log('Supabase DB Access Test Passed (app_settings read successful).');
    }
  }
});