-- 1. Make sure the safe wrapper exists (this is the official Supabase way)
CREATE OR REPLACE FUNCTION public.http_post(url text, headers jsonb, body text)
RETURNS extensions.http_response -- CORRECTED: Specify extensions.http_response
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    response extensions.http_response; -- CORRECTED: Specify extensions.http_response
BEGIN
    SELECT * INTO response
    FROM http_post(url := url, headers := headers, body := body);
    RETURN response;
END;
$$;

-- Grant execute so the trigger can use it
GRANT EXECUTE ON FUNCTION public.http_post(text, jsonb, text) TO anon, authenticated;

-- 2. COMPLETELY REPLACE the broken notify function with one that uses the safe wrapper
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
        'alert', jsonb_build_object( -- Changed to 'alert' to match Edge Function expectation
            'id', NEW.id,
            'title', NEW.title,
            'description', NEW.description, -- Changed to 'description' to match Edge Function expectation
            'type', NEW.type,
            'latitude', NEW.latitude,
            'longitude', NEW.longitude
        )
    );

    -- THIS IS THE IMPORTANT PART: use public.http_post, NOT extensions.http_post
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