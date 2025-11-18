// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import webpush from 'https://esm.sh/web-push@3.6.7?bundle'; // Using esm.sh with ?bundle

// Explicitly declare Deno global for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Define Json type locally for the Edge Function
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define a local interface for the subscription object from the database
interface DbPushSubscription {
  subscription: Json; // This will be the JSONB object
  endpoint: string; // This will be the top-level endpoint column
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Explicitly reject non-POST requests
  if (req.method !== 'POST') {
    console.error(`Edge Function Error: Method Not Allowed - Received ${req.method} request, expected POST.`);
    return new Response(JSON.stringify({ error: { message: 'Method Not Allowed: Only POST requests are supported.' } }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client with service role key for admin access
    // This client will have full admin privileges and bypass RLS,
    // so no user JWT verification is needed for this server-side function.
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL')!,
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use service role key directly
    );

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
      Deno.env.get('WEB_PUSH_PUBLIC_KEY')!, // Public key from Supabase secret
      // @ts-ignore
      Deno.env.get('WEB_PUSH_SECRET_KEY')! // Private key from Supabase secret
    );

    // Fetch all push subscriptions, including the top-level endpoint
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription, endpoint');

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
      sound: 'default', // Added to play default notification sound
      data: {
        url: `${Deno.env.get('VITE_APP_URL')}/incidents/${alert.id}`, // Link to incident detail page
        incidentId: alert.id,
      },
    });

    const sendPromises = subscriptions.map(async (sub: DbPushSubscription) => {
      try {
        // Reconstruct the webpush.PushSubscription object using the fetched endpoint and keys from the JSONB
        const pushSubscriptionToSend: webpush.PushSubscription = {
          endpoint: sub.endpoint,
          keys: (sub.subscription as any).keys, // Assuming keys are directly under subscription JSONB
          expirationTime: (sub.subscription as any).expirationTime || null, // Include expirationTime if present
        };
        // @ts-ignore
        await webpush.sendNotification(pushSubscriptionToSend, notificationPayload);
        console.log('Notification sent to:', sub.endpoint);
      } catch (sendError: any) {
        console.error('Error sending notification to subscription:', sub.endpoint, sendError);
        // Handle specific errors, e.g., delete expired subscriptions
        if (sendError.statusCode === 410 || sendError.statusCode === 404) { // GONE or NOT_FOUND
          console.log('Subscription expired or not found, deleting from DB:', sub.endpoint);
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint); // Use the top-level endpoint for deletion
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