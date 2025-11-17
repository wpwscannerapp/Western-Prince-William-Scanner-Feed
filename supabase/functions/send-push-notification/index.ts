// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import webpush from 'https://esm.sh/web-push@3.6.7'; // Import web-push

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request using the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    // Initialize Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL')!,
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Use service role key
      {
        global: {
          headers: { Authorization: `Bearer ${token}` }, // Pass the original token for RLS context if needed, though service role bypasses it
        },
      }
    );

    // Verify the JWT token to ensure the request is from an authenticated admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error('Edge Function Error: Unauthorized - User not authenticated or token invalid.', userError?.message || 'No user found.');
      return new Response(JSON.stringify({ error: { message: 'Unauthorized: User not authenticated or token invalid.' } }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.error('Edge Function Error: Forbidden - User is not an admin.', profileError?.message || 'User role is not admin.');
      return new Response(JSON.stringify({ error: { message: 'Forbidden: Only administrators can send push notifications.' } }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { alert } = await req.json();
    if (!alert || !alert.title || !alert.description) {
      return new Response(JSON.stringify({ error: { message: 'Bad Request: Missing alert title or description.' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Set VAPID keys
    // @ts-ignore
    webpush.setVapidDetails(
      'mailto:wpwscannerfeed@gmail.com', // Contact email for VAPID
      // @ts-ignore
      Deno.env.get('VITE_WEB_PUSH_PUBLIC_KEY')!, // Public key from client-side env
      // @ts-ignore
      Deno.env.get('WEB_PUSH_PRIVATE_KEY')! // Private key from Supabase secret
    );

    // Fetch all push subscriptions
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription');

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return new Response(JSON.stringify({ error: { message: 'Failed to fetch subscriptions.' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notificationPayload = JSON.stringify({
      title: alert.title,
      body: alert.description,
      icon: '/Logo.png', // Path to your app icon
      badge: '/Logo.png', // Path to your app badge icon
      data: {
        url: `${Deno.env.get('VITE_APP_URL')}/incidents/${alert.id}`, // Link to incident detail page
        incidentId: alert.id,
      },
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        // @ts-ignore
        await webpush.sendNotification(sub.subscription, notificationPayload);
        console.log('Notification sent to:', sub.subscription.endpoint);
      } catch (sendError: any) {
        console.error('Error sending notification to subscription:', sub.subscription.endpoint, sendError);
        // Handle specific errors, e.g., delete expired subscriptions
        if (sendError.statusCode === 410 || sendError.statusCode === 404) { // GONE or NOT_FOUND
          console.log('Subscription expired or not found, deleting from DB:', sub.subscription.endpoint);
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('subscription->>endpoint', sub.subscription.endpoint);
        }
      }
    });

    await Promise.allSettled(sendPromises); // Use allSettled to ensure all promises run

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Unexpected error in send-push-notification Edge Function:', error);
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});