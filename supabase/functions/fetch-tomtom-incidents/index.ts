// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define a timeout for the external API call
const TOMTOM_API_TIMEOUT = 10000; // 10 seconds

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const tomtomApiUrl = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${tomtomApiKey}&bbox=${boundingBox}&zoom=${zoom}&language=${language || 'en-US'}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TOMTOM_API_TIMEOUT);

    let response;
    try {
      response = await fetch(tomtomApiUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('TomTom API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `Failed to fetch traffic data from TomTom: ${response.statusText}. Details: ${errorText.substring(0, 100)}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('TomTom API request timed out.');
      return new Response(JSON.stringify({ error: 'TomTom API request timed out.' }), {
        status: 504, // Gateway Timeout
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('Error in fetch-tomtom-incidents Edge Function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});