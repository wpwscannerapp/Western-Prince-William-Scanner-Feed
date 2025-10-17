import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log the actual values for debugging
console.log('Supabase Client Debug: VITE_SUPABASE_URL value:', supabaseUrl);
console.log('Supabase Client Debug: VITE_SUPABASE_ANON_KEY value:', supabaseAnonKey); // Always log for debugging

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not defined in environment variables. Please check your .env file.');
}
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not defined in environment variables. Please check your .env file.');
}

// Basic validation to ensure it looks like a URL
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error('Invalid VITE_SUPABASE_URL: Must be a valid HTTP or HTTPS URL (e.g., "https://your-project-id.supabase.co").');
}

// Add a check for the Supabase anon key format
if (!supabaseAnonKey.startsWith('eyJ')) {
  console.error('Supabase Client Error: VITE_SUPABASE_ANON_KEY appears to be invalid. It should start with "eyJ". Please verify your key in the .env file.');
  throw new Error('Invalid VITE_SUPABASE_ANON_KEY: Please verify your Supabase project API keys.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('Supabase Client Debug: Client created successfully.');

// Explicitly test the Supabase connection
supabase.auth.getSession().then(({ error }) => {
  if (error) {
    console.error('Supabase Client Debug: Initial session fetch failed:', error);
  } else {
    console.log('Supabase Client Debug: Initial session fetch successful.');
  }
});