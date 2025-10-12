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
    const rawBody = await req.text();
    console.log('Edge Function: Received raw request body:', rawBody);
    
    const { location } = JSON.parse(rawBody);
    console.log('Edge Function: Parsed location:', location);

    if (!location) {
      console.error('Edge Function: Missing location parameter in parsed body.');
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
    console.log('Edge Function: Geocoding URL:', geocodingUrl);
    
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = await geocodingResponse.json();
    console.log('Edge Function: Geocoding Response HTTP Status:', geocodingResponse.status);
    console.log('Edge Function: Geocoding Data Status:', geocodingData.status);
    console.log('Edge Function: Geocoding Data:', JSON.stringify(geocodingData, null, 2)); // Log full geocoding data

    // Explicitly check for Google API error messages
    if (geocodingData.status === 'REQUEST_DENIED' || geocodingData.error_message) {
      console.error('Google Geocoding API denied request:', geocodingData.error_message || 'Unknown denial reason');
      return new Response(JSON.stringify({ error: geocodingData.error_message || 'Google Maps API request denied. Please check your API key and permissions.' }), {
        status: 400, // Still a client-side issue (bad key/permissions)
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!geocodingResponse.ok || geocodingData.results.length === 0) {
      console.error('Geocoding failed or returned no results:', geocodingData);
      return new Response(JSON.stringify({ error: 'Could not find coordinates for the specified location. Please try a more specific address or city.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { lat, lng } = geocodingData.results[0].geometry.location;

    // Step 2: Construct the Google Maps Embed API URL with 'traffic' mode.
    const embedUrl = `https://www.google.com/maps/embed/v1/traffic?key=${googleMapsApiKey}&center=${lat},${lng}&zoom=12`;
    console.log('Edge Function: Generated Embed URL:', embedUrl); // Log the generated URL

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