// @ts-ignore
/// <reference lib="deno.ns" />
// @ts-ignore
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Authenticate the user (optional, but good practice if you want to restrict access)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { city } = await req.json();

    if (!city) {
      return new Response(JSON.stringify({ error: 'City parameter is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore
    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    if (!OPENWEATHER_API_KEY) {
      return new Response(JSON.stringify({ error: 'OpenWeatherMap API key is not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=imperial`;
    const alertsApiUrl = `https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&exclude=current,minutely,hourly,daily&appid=${OPENWEATHER_API_KEY}`;

    const weatherResponse = await fetch(weatherApiUrl);
    const weatherData = await weatherResponse.json();

    if (!weatherResponse.ok) {
      console.error('OpenWeatherMap API error:', weatherData);
      return new Response(JSON.stringify({ error: weatherData.message || 'Failed to fetch weather data.' }), {
        status: weatherResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let alertsData = null;
    if (weatherData.coord) {
      const { lat, lon } = weatherData.coord;
      const fullAlertsApiUrl = alertsApiUrl.replace('{lat}', lat).replace('{lon}', lon);
      const alertsResponse = await fetch(fullAlertsApiUrl);
      alertsData = await alertsResponse.json();
      if (!alertsResponse.ok) {
        console.warn('Failed to fetch weather alerts:', alertsData);
        alertsData = null; // Don't fail the whole request if alerts fail
      }
    }

    return new Response(JSON.stringify({ weather: weatherData, alerts: alertsData?.alerts || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in fetch-weather Edge Function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});