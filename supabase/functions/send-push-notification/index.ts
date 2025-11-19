// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { signVAPID } from 'https://deno.land/x/vapid@v1.0.0/mod.ts'; // Deno-native VAPID signing
// @ts-ignore
import { encrypt } from 'https://deno.land/x/web_push_encryption@v0.1.0/mod.ts'; // Deno-native payload encryption

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
  subscription: Json; // This will be the JSONB object containing keys
  endpoint: string; // This will be the top-level endpoint column
}

serve(async (req: Request) => {
  // Debug log to trigger redeployment
  console.log('Edge Function: send-push-notification invoked. Attempting to resolve module dependencies.');

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

    // Retrieve VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('WEB_PUSH_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('WEB_PUSH_SECRET_KEY')!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('Edge Function Error: VAPID keys are not configured.');
      return new Response(JSON.stringify({ error: { message: 'Server Error: VAPID keys are not configured.' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        const subscriptionKeys = (sub.subscription as any).keys;
        if (!subscriptionKeys || !subscriptionKeys.p256dh || !subscriptionKeys.auth) {
          console.warn('Skipping subscription due to missing keys:', sub.endpoint);
          return;
        }

        // Generate VAPID JWT
        const vapidHeaders = await signVAPID({
          aud: sub.endpoint,
          sub: 'mailto:wpwscannerfeed@gmail.com', // VAPID contact email
          privateKey: vapidPrivateKey,
          publicKey: vapidPublicKey,
          expiration: 12 * 60 * 60, // 12 hours
        });

        // Encrypt the payload
        const encryptedPayload = await encrypt(
          notificationPayload,
          subscriptionKeys.p256dh,
          subscriptionKeys.auth,
        );

        const headers = new Headers({
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Encoding': 'aesgcm',
          'Authorization': vapidHeaders.Authorization,
          'Crypto-Key': vapidHeaders['Crypto-Key'],
          'TTL': '2419200', // 4 weeks
        });

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: headers,
          body: encryptedPayload,
        });

        if (!response.ok) {
          console.error(`Failed to send notification to ${sub.endpoint}: ${response.status} ${response.statusText}`);
          // Handle specific errors, e.g., delete expired subscriptions
          if (response.status === 410 || response.status === 404) { // GONE or NOT_FOUND
            console.log('Subscription expired or not found, deleting from DB:', sub.endpoint);
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
        } else {
          console.log('Notification sent to:', sub.endpoint);
        }
      } catch (sendError: any) {
        console.error('Error sending notification to subscription:', sub.endpoint, sendError);
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