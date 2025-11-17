-- Ensure the http extension is enabled in the public schema
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Recreate the function to send web push notifications on new alerts
CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public' -- Ensure search path includes public to find public.http_post
AS $$
DECLARE
  project_ref TEXT := 'wvvxkwvliogulfqmkaqb'; -- Your Supabase Project ID
  edge_function_url TEXT;
  auth_token TEXT;
  res_status INT;
  res_body TEXT;
BEGIN
  -- Construct the Edge Function URL
  edge_function_url := 'https://' || project_ref || '.supabase.co/functions/v1/send-push-notification';

  -- Get the JWT token of the user who initiated the database change
  -- This token is needed by the Edge Function to authenticate and verify admin role
  SELECT current_setting('request.jwt.arr', true) INTO auth_token;

  RAISE NOTICE 'notify_web_push_on_new_alert: Auth Token: %', auth_token;
  RAISE NOTICE 'notify_web_push_on_new_alert: Edge Function URL: %', edge_function_url;

  -- Call the public.http_post wrapper function
  SELECT
    status,
    content
  INTO
    res_status,
    res_body
  FROM
    public.http_post( -- Changed to public.http_post
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || auth_token -- Pass the JWT token for authentication
      ),
      body := jsonb_build_object(
        'alert', jsonb_build_object(
          'id', NEW.id,
          'title', NEW.title,
          'description', NEW.description,
          'type', NEW.type,
          'latitude', NEW.latitude,
          'longitude', NEW.longitude
        )
      )::TEXT
    );

  RAISE NOTICE 'notify_web_push_on_new_alert: Edge Function Response Status: %', res_status;
  RAISE NOTICE 'notify_web_push_on_new_alert: Edge Function Response Body: %', res_body;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS on_alert_created ON public.alerts;

-- Create the trigger to fire after a new alert is inserted
CREATE TRIGGER on_alert_created
AFTER INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_web_push_on_new_alert();