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
    // This Edge Function does not require user authentication for now,
    // as traffic data is generally public. If you need to restrict access,
    // you would add Supabase auth checks here.

    // @ts-ignore
    const tomtomApiKey = Deno.env.get('TOMTOM_API_KEY');
    if (!tomtomApiKey) {
      return new Response(JSON.stringify({ error: 'TomTom API key not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { boundingBox, zoom, language } = await req.json();

    if (!boundingBox || !zoom) {
      return new Response(JSON.stringify({ error: 'Missing boundingBox or zoom parameters.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Example bounding box for Prince William County, VA (approximate)
    // Format: minLat,minLon,maxLat,maxLon
    // const defaultBoundingBox = '38.60,-77.60,38.80,-77.20'; 
    // For simplicity, we'll use the provided boundingBox directly.

    const tomtomApiUrl = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${tomtomApiKey}&bbox=${boundingBox}&zoom=${zoom}&language=${language || 'en-US'}`;

    const response = await fetch(tomtomApiUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('TomTom API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `Failed to fetch traffic data from TomTom: ${response.statusText}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in fetch-tomtom-incidents Edge Function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});