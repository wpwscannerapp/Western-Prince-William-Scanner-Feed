// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

console.log('Function initializing...');

// @ts-ignore
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-ignore
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// @ts-ignore
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''; // Needed for client-side auth

console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? 'Set' : 'Missing');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');


if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables.');
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY must be set.');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('Received request:', req.method, req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client for authentication (using anon key and auth header)
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.warn('Unauthorized attempt to send push notification:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.warn(`Forbidden attempt by user ${user.id} (role: ${profile?.role}) to send push notification.`);
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can send notifications.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { subscription, title, body, url } = await req.json();
    console.log('Request payload:', { subscription, title, body, url });

    if (!subscription || !title || !body) {
      console.error('Invalid payload: Missing subscription, title, or body.');
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the service role key for database operations as it bypasses RLS
    const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabaseServiceRole
      .from('push_notifications')
      .insert({
        subscription: subscription,
        title,
        body,
        url,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error.message);
      throw error;
    }

    console.log('Notification stored:', data);

    return new Response(JSON.stringify({ message: 'Notification queued successfully', data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Function error:', error.message, error.stack);
    return new Response(JSON.stringify({ error: 'Failed to process notification', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});