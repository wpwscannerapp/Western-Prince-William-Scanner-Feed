// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import Stripe from "https://esm.sh/stripe@16.2.0?target=deno&deno-std=0.190.0";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get('stripe-signature');
    // @ts-ignore
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return new Response('Missing Stripe-Signature header or webhook secret', { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL')!,
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    switch (event.type) {
      case 'checkout.session.completed':
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const userId = checkoutSession.metadata?.userId;
        const customerId = checkoutSession.customer as string;
        const subscriptionId = checkoutSession.subscription as string;

        if (userId && customerId && subscriptionId) {
          // Update user profile with Stripe customer and subscription IDs
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'trialing', // Or 'active' if no trial
            })
            .eq('id', userId);

          if (profileError) {
            console.error('Error updating profile on checkout.session.completed:', profileError);
            return new Response(JSON.stringify({ error: profileError.message }), { status: 500 });
          }
        }
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        const newStatus = subscription.status;
        const stripeSubscriptionId = subscription.id;

        // Find the user by stripe_subscription_id and update their status
        const { data: profileData, error: fetchError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .single();

        if (fetchError) {
          console.error('Error fetching profile for subscription update:', fetchError);
          return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
        }

        if (profileData) {
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: newStatus })
            .eq('id', profileData.id);

          if (updateError) {
            console.error('Error updating subscription status:', updateError);
            return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}. Acknowledging receipt.`);
        // Return 200 for unhandled events to prevent Stripe from retrying
        return new Response(JSON.stringify({ received: true, message: `Unhandled event type: ${event.type}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Stripe webhook handler failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});