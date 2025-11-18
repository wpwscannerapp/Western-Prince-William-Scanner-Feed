-- 1. Correct the public.http_post wrapper function to explicitly call extensions.http_post
CREATE OR REPLACE FUNCTION public.http_post(url text, headers jsonb, body text)
RETURNS extensions.http_response
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    response extensions.http_response;
BEGIN
    -- CORRECTED: Explicitly call extensions.http_post to prevent recursion
    SELECT * INTO response
    FROM extensions.http_post(url := url, headers := headers, body := body);
    RETURN response;
END;
$$;

-- Correct the other public.http_post overload as well for consistency
CREATE OR REPLACE FUNCTION public.http_post(url text, body text, content_type text)
 RETURNS extensions.http_response
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    response extensions.http_response;
BEGIN
  -- CORRECTED: Explicitly call extensions.http_post to prevent recursion
  SELECT * INTO response
  FROM extensions.http_post(url := url, body := body, content_type := content_type);
  RETURN response;
END;
$$;

-- Grant execute so the trigger can use it
GRANT EXECUTE ON FUNCTION public.http_post(text, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.http_post(text, text, text) TO anon, authenticated;


-- 2. Recreate the notify_web_push_on_new_alert function (in case it was affected or needs to re-link)
DROP FUNCTION IF EXISTS notify_web_push_on_new_alert() CASCADE;

CREATE FUNCTION notify_web_push_on_new_alert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    payload jsonb;
    auth_token text := current_setting('request.jwt.claims', true)::jsonb->>'supabase_access_token';
    edge_url text := 'https://wvvxkwvliogulfqmkaqb.supabase.co/functions/v1/send-push-notification'; -- Using your project ID
BEGIN
    -- Build the payload you want to send to your Edge Function
    payload := jsonb_build_object(
        'alert', jsonb_build_object(
            'id', NEW.id,
            'title', NEW.title,
            'description', NEW.description,
            'type', NEW.type,
            'latitude', NEW.latitude,
            'longitude', NEW.longitude
        )
    );

    -- This now correctly calls the non-recursive public.http_post wrapper
    PERFORM public.http_post(
        url := edge_url,
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || auth_token,
            'Content-Type', 'application/json',
            'apikey', current_setting('request.headers')::jsonb->>'apikey'
        ),
        body := payload::text
    );

    RETURN NEW;
END;
$$;

-- 3. Re-create the trigger (in case it got dropped)
DROP TRIGGER IF EXISTS on_alert_created ON alerts;

CREATE TRIGGER on_alert_created
    AFTER INSERT ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION notify_web_push_on_new_alert();