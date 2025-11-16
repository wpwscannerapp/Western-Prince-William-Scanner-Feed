"use client";
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
    // Initialize Supabase client for authentication
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

    // Authenticate the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Edge Function Error: Unauthorized - User not authenticated.', userError);
      return new Response(JSON.stringify({ error: { message: 'Unauthorized: User not authenticated.' } }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { priceId, userId, userEmail } = await req.json();

    // Log the received priceId for debugging
    console.log('Edge Function: Received priceId:', priceId);

    if (!priceId || !userId || !userEmail) {
      console.error('Edge Function Error: Bad Request - Missing priceId, userId, or userEmail.', { priceId, userId, userEmail });
      return new Response(JSON.stringify({ error: { message: 'Bad Request: Missing priceId, userId, or userEmail.' } }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate that the userId from the request matches the authenticated user's ID
    if (userId !== user.id) {
      console.error('Edge Function Error: Forbidden - User ID mismatch.', { requestedUserId: userId, authenticatedUserId: user.id });
      return new Response(JSON.stringify({ error: { message: 'Forbidden: User ID mismatch.' } }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Validate priceId by attempting to retrieve it from Stripe
    try {
      await stripe.prices.retrieve(priceId);
    } catch (priceError: any) {
      console.error('Edge Function Error: Stripe Price ID validation failed:', priceError);
      return new Response(JSON.stringify({ error: { message: 'Bad Request: Invalid Stripe Price ID provided.' } }), {
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
    console.error('Edge Function Error: Stripe checkout session creation failed:', error);
    return new Response(JSON.stringify({ error: { message: (error as Error).message } }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});