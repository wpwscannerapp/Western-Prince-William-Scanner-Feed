// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import Stripe from "https://esm.sh/stripe@16.2.0?target=deno&deno-std=0.190.0";
// The createClient import is not strictly needed if supabaseAdmin is removed,
// but keeping it for completeness if future logic requires it.
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // supabaseAdmin is not used in this specific function, as the profile update
    // is handled by the stripe-webhook Edge Function.
    // If you need to interact with Supabase from this function in the future,
    // uncomment and use the createClient import and supabaseAdmin variable.
    /*
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    */

    // @ts-ignore
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { priceId, userId, userEmail } = await req.json();

    if (!priceId || !userId || !userEmail) {
      return new Response(JSON.stringify({ error: 'Missing priceId, userId, or userEmail' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore
    const YOUR_DOMAIN = Deno.env.get('VITE_APP_URL') || 'http://localhost:8080';

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/home?success=true`,
      cancel_url: `${YOUR_DOMAIN}/subscribe?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
      },
      subscription_data: {
        trial_period_days: 7,
      },
    });

    return new Response(JSON.stringify({ checkoutUrl: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Stripe checkout session creation failed:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});