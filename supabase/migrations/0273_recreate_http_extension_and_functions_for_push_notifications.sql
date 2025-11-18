-- Ensure the http extension is enabled in the public schema
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA public;

-- Drop existing public.http_post functions to prevent conflicts during recreation
DROP FUNCTION IF EXISTS public.http_post(uri character varying, content character varying, content_type character varying);
DROP FUNCTION IF EXISTS public.http_post(uri character varying, data jsonb);

-- Recreate public.http_post functions as wrappers for extensions.http_post
CREATE OR REPLACE FUNCTION public.http_post(uri character varying, body character varying, content_type character varying)
 RETURNS extensions.http_response
 LANGUAGE sql
AS $function$
    SELECT extensions.http(('POST', uri, NULL, content_type, body)::extensions.http_request);
$function$;

CREATE OR REPLACE FUNCTION public.http_post(uri character varying, data jsonb)
 RETURNS extensions.http_response
 LANGUAGE sql
AS $function$
    SELECT extensions.http(('POST', uri, NULL, 'application/x-www-form-urlencoded', public.urlencode(data))::extensions.http_request);
$function$;

-- Grant execute permissions on the new http_post functions
GRANT EXECUTE ON FUNCTION public.http_post(uri character varying, body character varying, content_type character varying) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.http_post(uri character varying, data jsonb) TO PUBLIC;

-- Drop the existing notify_web_push_on_new_alert function if it exists
DROP FUNCTION IF EXISTS public.notify_web_push_on_new_alert();

-- Recreate the notify_web_push_on_new_alert function
CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  payload jsonb;
  supabase_url TEXT := current_setting('supabase.url');
  supabase_anon_key TEXT := current_setting('request.headers', true)::jsonb->>'apikey';
  jwt_token TEXT := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'supabase_access_token', '');
BEGIN
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
    uri := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || jwt_token,
      'Content-Type', 'application/json',
      'apikey', supabase_anon_key
    ),
    body := payload::text
  );

  RETURN NEW;
END;
$$;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_alert_created ON public.alerts;

-- Recreate the trigger to call the updated notify_web_push_on_new_alert function
CREATE TRIGGER on_alert_created
AFTER INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_web_push_on_new_alert();