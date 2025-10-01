// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import webPush from 'https://esm.sh/web-push@3.6.7?target=deno&deno-std=0.190.0'; // Explicitly target Deno for compatibility

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  updated_at: string;
}

serve(async (req: Request) => {
  console.log('Edge Function send-push-notification started.');
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received.');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL')!,
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // @ts-ignore
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

    // 1. Authenticate and Authorize Admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication failed:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('User authenticated:', user.id);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.error('Authorization failed: User is not admin or profile error:', profileError?.message);
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can send notifications.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('User authorized as admin.');

    // 2. Get notification payload
    const { title, body, url } = await req.json();
    console.log('Notification payload received:', { title, body, url });

    if (!title || !body) {
      console.error('Missing title or body for notification.');
      return new Response(JSON.stringify({ error: 'Missing title or body for notification' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Configure web-push
    // @ts-ignore
    const webPushPublicKey = Deno.env.get('VITE_WEB_PUSH_PUBLIC_KEY');
    // @ts-ignore
    const webPushPrivateKey = Deno.env.get('WEB_PUSH_SECRET_KEY');

    console.log('VAPID Public Key (first 10 chars):', webPushPublicKey ? webPushPublicKey.substring(0, 10) : 'NOT SET');
    console.log('VAPID Private Key (first 10 chars):', webPushPrivateKey ? webPushPrivateKey.substring(0, 10) : 'NOT SET');

    if (!webPushPublicKey || !webPushPrivateKey) {
      console.error('Web Push VAPID keys not configured.');
      return new Response(JSON.stringify({ error: 'Web Push VAPID keys not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    webPush.setVapidDetails(
      'mailto:admin@example.com',
      webPushPublicKey,
      webPushPrivateKey
    );
    console.log('webPush VAPID details set.');

    // 4. Fetch all subscriptions
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*');

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Fetched ${subscriptions?.length || 0} subscriptions.`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found.');
      return new Response(JSON.stringify({ message: 'No active subscriptions found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Send notifications
    const notificationPayload = JSON.stringify({ title, body, url });
    const sendPromises = subscriptions.map(async (sub: UserSubscription) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };
      try {
        await webPush.sendNotification(pushSubscription, notificationPayload);
        console.log(`Notification sent to ${sub.user_id}`);
      } catch (pushError: any) {
        console.error(`Failed to send notification to ${sub.user_id}:`, pushError);
        if (pushError.statusCode === 410) {
          console.log(`Deleting expired subscription for ${sub.user_id}`);
          await supabaseAdmin.from('user_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);
    console.log('All notification send attempts completed.');

    return new Response(JSON.stringify({ message: 'Notifications sent successfully (or attempted).' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-push-notification Edge Function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});