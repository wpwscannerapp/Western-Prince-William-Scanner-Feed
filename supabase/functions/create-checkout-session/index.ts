// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import Stripe from "https://esm.sh/stripe@16.2.0?target=deno&deno-std=0.190.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => { // Explicitly type 'req' as Request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
  } catch (error: unknown) { // Explicitly type 'error' as unknown
    console.error('Stripe checkout session creation failed:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { // Assert 'error' as Error
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});