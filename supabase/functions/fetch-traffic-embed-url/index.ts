// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location } = await req.json();

    if (!location) {
      return new Response(JSON.stringify({ error: 'Missing location parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    if (!googleMapsApiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set in Supabase secrets.');
      return new Response(JSON.stringify({ error: 'Google Maps API key is not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Geocode the location to get latitude and longitude
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${googleMapsApiKey}`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = await geocodingResponse.json();

    if (!geocodingResponse.ok || geocodingData.status !== 'OK' || geocodingData.results.length === 0) {
      console.error('Geocoding failed:', geocodingData);
      return new Response(JSON.stringify({ error: 'Could not find coordinates for the specified location. Please try a more specific address or city.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { lat, lng } = geocodingData.results[0].geometry.location;

    // Step 2: Construct the Google Maps Embed API URL with 'view' mode and 'layer=traffic'
    // The 'center' parameter is required for 'view' mode.
    const embedUrl = `https://www.google.com/maps/embed/v1/view?key=${googleMapsApiKey}&center=${lat},${lng}&zoom=12&layer=traffic`;

    return new Response(JSON.stringify({ embedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in fetch-traffic-embed-url Edge Function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});