// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from 'https://deno.land/std@0.223.0/http/server.ts'; // Updated Deno std version
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'; // Updated Supabase JS version

console.log('Function initializing...');

// @ts-ignore
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-ignore
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables.');
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
    const { subscription, title, body, url } = await req.json(); // Added 'url'
    console.log('Request payload:', { subscription, title, body, url });

    if (!subscription || !title || !body) {
      console.error('Invalid payload: Missing subscription, title, or body.');
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('push_notifications')
      .insert({
        subscription: subscription, // Store as JSONB directly
        title,
        body,
        url, // Store URL
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