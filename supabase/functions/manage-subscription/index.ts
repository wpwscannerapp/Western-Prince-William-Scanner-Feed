// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.223.0/http/server.ts"; // Updated Deno std version
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'; // Updated Supabase JS version

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL')!,
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, subscription } = await req.json();

    if (!action || !subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: 'Missing action or subscription data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'subscribe') {
      const { error } = await supabaseClient
        .from('push_subscriptions') // Use new table
        .upsert(
          {
            user_id: user.id,
            subscription: subscription, // Store full JSONB object
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'subscription->>endpoint' } // Conflict on endpoint within JSONB
        );

      if (error) {
        console.error('Error saving subscription:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ message: 'Subscription saved successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'unsubscribe') {
      const { error } = await supabaseClient
        .from('push_subscriptions') // Use new table
        .delete()
        .eq('subscription->>endpoint', subscription.endpoint) // Query by endpoint within JSONB
        .eq('user_id', user.id); // Ensure user can only delete their own

      if (error) {
        console.error('Error deleting subscription:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ message: 'Subscription removed successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('Error in manage-subscription Edge Function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});