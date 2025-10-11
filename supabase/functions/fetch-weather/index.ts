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
      console.error('fetch-weather: Unauthorized access attempt:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { city } = await req.json();
    console.log('fetch-weather: Received request for city:', city);

    if (!city) {
      console.error('fetch-weather: City parameter is missing.');
      return new Response(JSON.stringify({ error: 'City parameter is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore
    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    console.log('fetch-weather: OPENWEATHER_API_KEY status:', OPENWEATHER_API_KEY ? 'Set' : 'Missing');

    if (!OPENWEATHER_API_KEY) {
      console.error('fetch-weather: OpenWeatherMap API key is not configured in Supabase secrets.');
      return new Response(JSON.stringify({ error: 'OpenWeatherMap API key is not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=imperial`;
    const alertsApiUrl = `https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&exclude=current,minutely,hourly,daily&appid=${OPENWEATHER_API_KEY}`;
    console.log('fetch-weather: Fetching weather from URL:', weatherApiUrl);

    const weatherResponse = await fetch(weatherApiUrl);
    const weatherData = await weatherResponse.json();
    console.log('fetch-weather: OpenWeatherMap weather response status:', weatherResponse.status);
    console.log('fetch-weather: OpenWeatherMap weather data:', weatherData);

    if (!weatherResponse.ok) {
      console.error('fetch-weather: OpenWeatherMap API error:', weatherData);
      return new Response(JSON.stringify({ error: weatherData.message || 'Failed to fetch weather data.' }), {
        status: weatherResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let alertsData = null;
    if (weatherData.coord) {
      const { lat, lon } = weatherData.coord;
      const fullAlertsApiUrl = alertsApiUrl.replace('{lat}', lat).replace('{lon}', lon);
      console.log('fetch-weather: Fetching alerts from URL:', fullAlertsApiUrl);
      const alertsResponse = await fetch(fullAlertsApiUrl);
      alertsData = await alertsResponse.json();
      console.log('fetch-weather: OpenWeatherMap alerts response status:', alertsResponse.status);
      console.log('fetch-weather: OpenWeatherMap alerts data:', alertsData);

      if (!alertsResponse.ok) {
        console.warn('fetch-weather: Failed to fetch weather alerts:', alertsData);
        alertsData = null; // Don't fail the whole request if alerts fail
      }
    }

    return new Response(JSON.stringify({ weather: weatherData, alerts: alertsData?.alerts || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('fetch-weather: Error in Edge Function:', error.message, error.stack);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});