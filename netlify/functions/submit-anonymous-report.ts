import type { Handler } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase environment variables.");
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Configuration error." }),
    };
  }

  try {
    const { description, location, type } = JSON.parse(event.body || '{}');

    if (!description || !location || !type) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields: description, location, type.' }),
      };
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false, // Important for server-side functions
        },
      }
    );

    const { data, error } = await supabaseAdmin
      .from('anonymous_incident_reports')
      .insert([{ description, location, type }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting anonymous report:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Failed to submit report: ${error.message}` }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Anonymous incident report submitted successfully!', report: data }),
    };
  } catch (error: any) {
    console.error("Function execution error:", error.message, error.stack);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };