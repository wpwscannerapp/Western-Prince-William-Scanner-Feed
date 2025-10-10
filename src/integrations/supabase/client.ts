import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Client Debug: Raw VITE_SUPABASE_URL:', supabaseUrl);
console.log('Supabase Client Debug: Raw VITE_SUPABASE_ANON_KEY:', supabaseAnonKey);

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('Supabase Client Debug: Client created successfully.');