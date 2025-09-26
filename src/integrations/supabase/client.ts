import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// TEMPORARY: Added console logs for debugging environment variables.
// REMOVE THESE IN PRODUCTION.
console.log('DEBUG: Supabase URL from .env:', supabaseUrl);
console.log('DEBUG: Supabase Anon Key from .env:', supabaseAnonKey ? 'Loaded (not displayed for security)' : 'Not loaded');


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