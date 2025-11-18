-- 1. Enable the http extension in the extensions schema
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Drop existing public.http_post functions to prepare for recreation
DROP FUNCTION IF EXISTS public.http_post(url text, headers jsonb, body text);
DROP FUNCTION IF EXISTS public.http_post(url text, body text, content_type text);

-- 3. Recreate public.http_post functions with explicit search_path and correct security settings
CREATE OR REPLACE FUNCTION public.http_post(url text, headers jsonb, body text)
 RETURNS extensions.http_response
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'extensions'
AS $$
BEGIN
  RETURN extensions.http_post(url := url, headers := headers, body := body);
END;
$$;

CREATE OR REPLACE FUNCTION public.http_post(url text, body text, content_type text)
 RETURNS extensions.http_response
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'extensions'
AS $$
BEGIN
  RETURN extensions.http_post(url := url, body := body, content_type := content_type);
END;
$$;

-- Grant execute permissions on the public.http_post functions
GRANT EXECUTE ON FUNCTION public.http_post(url text, headers jsonb, body text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.http_post(url text, body text, content_type text) TO authenticated, service_role;

-- 4. Drop existing notify_web_push_on_new_alert function and its trigger
DROP TRIGGER IF EXISTS on_alert_created ON public.alerts;
DROP FUNCTION IF EXISTS public.notify_web_push_on_new_alert();

-- 5. Recreate notify_web_push_on_new_alert function
CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
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
    public.http_post(
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

-- 6. Recreate the trigger on_alert_created
CREATE TRIGGER on_alert_created
  AFTER INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_web_push_on_new_alert();