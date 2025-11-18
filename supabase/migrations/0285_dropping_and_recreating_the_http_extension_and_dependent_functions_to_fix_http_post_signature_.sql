-- 1. Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_alert_created ON public.alerts;

-- 2. Drop the existing notify_web_push_on_new_alert function if it exists
DROP FUNCTION IF EXISTS public.notify_web_push_on_new_alert();

-- 3. Drop the http extension (this will remove all its functions)
DROP EXTENSION IF EXISTS http CASCADE;

-- 4. Re-enable the http extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 5. Create a new public.http_post function that accepts headers as jsonb
CREATE OR REPLACE FUNCTION public.http_post(
    uri text,
    body text,
    content_type text,
    headers jsonb DEFAULT '{}'::jsonb
)
 RETURNS extensions.http_response
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
    http_headers extensions.http_header[];
    header_key text;
    header_value text;
BEGIN
    -- Convert jsonb headers to an array of http_header
    FOR header_key, header_value IN SELECT * FROM jsonb_each_text(headers)
    LOOP
        http_headers := array_append(http_headers, (header_key, header_value)::extensions.http_header);
    END LOOP;

    RETURN extensions.http(
        ('POST', uri, http_headers, content_type, body)::extensions.http_request
    );
END;
$$;

-- 6. Grant execute permissions on the new http_post function
GRANT EXECUTE ON FUNCTION public.http_post(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.http_post(text, text, text, jsonb) TO supabase_auth_admin;

-- 7. Recreate the notify_web_push_on_new_alert function to use the new http_post signature
CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  payload jsonb;
  supabase_access_token text;
  api_key text;
BEGIN
  -- Get the JWT token and API key from the request context
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'supabase_access_token', '') INTO supabase_access_token;
  SELECT COALESCE(current_setting('request.headers', true)::jsonb->>'apikey', '') INTO api_key;

  payload := jsonb_build_object(
    'alert', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'description', NEW.description,
      'type', NEW.type,
      'latitude', NEW.latitude,
      'longitude', NEW.longitude,
      'created_at', NEW.created_at
    )
  );

  PERFORM public.http_post(
    uri := 'https://wvvxkwvliogulfqmkaqb.supabase.co/functions/v1/send-push-notification',
    body := payload::text,
    content_type := 'application/json',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || supabase_access_token,
      'Content-Type', 'application/json',
      'apikey', api_key
    )
  );

  RETURN NEW;
END;
$$;

-- 8. Recreate the trigger to call the function on new alerts
CREATE TRIGGER on_alert_created
  AFTER INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_web_push_on_new_alert();