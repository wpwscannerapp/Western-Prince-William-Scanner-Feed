-- Drop existing function if it exists to allow recreation
DROP FUNCTION IF EXISTS public.notify_web_push_on_new_alert() CASCADE;

-- Create the function to invoke the Edge Function
CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public', 'extensions' -- Ensure 'extensions' is in search_path for supabase_functions
AS $$
DECLARE
  -- Define the URL for your Supabase Edge Function
  -- Replace 'wvvxkwvliogulfqmkaqb' with your actual Supabase Project ID
  -- The function name 'send-push-notification' must match your deployed Edge Function name
  FUNCTION_URL TEXT := 'https://wvvxkwvliogulfqmkaqb.supabase.co/functions/v1/send-push-notification';
  SUPABASE_ANON_KEY TEXT := current_setting('request.headers', true)::json->>'apikey';
  AUTH_HEADER TEXT := current_setting('request.headers', true)::json->>'authorization';
  RESPONSE_STATUS INT;
  RESPONSE_BODY TEXT;
BEGIN
  -- Only send notifications for new alerts (INSERT operations)
  IF TG_OP = 'INSERT' THEN
    -- Invoke the Edge Function
    SELECT
      status,
      content
    INTO
      RESPONSE_STATUS,
      RESPONSE_BODY
    FROM
      extensions.http_post(
        FUNCTION_URL,
        '{"Content-Type": "application/json", "Authorization": "' || AUTH_HEADER || '", "apikey": "' || SUPABASE_ANON_KEY || '"}'::jsonb,
        json_build_object(
          'alert', json_build_object(
            'id', NEW.id,
            'title', NEW.title,
            'description', NEW.description,
            'type', NEW.type,
            'latitude', NEW.latitude,
            'longitude', NEW.longitude
          )
        )::text
      );

    -- Log the response from the Edge Function for debugging
    RAISE NOTICE 'Edge Function Response Status: %', RESPONSE_STATUS;
    RAISE NOTICE 'Edge Function Response Body: %', RESPONSE_BODY;

    -- You might want to handle errors from the Edge Function here
    IF RESPONSE_STATUS >= 400 THEN
      RAISE WARNING 'Failed to send push notification via Edge Function. Status: %, Body: %', RESPONSE_STATUS, RESPONSE_BODY;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists to allow recreation
DROP TRIGGER IF EXISTS on_new_alert_send_push_notification ON public.alerts;

-- Create the trigger to call the function on new alert inserts
CREATE TRIGGER on_new_alert_send_push_notification
AFTER INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_web_push_on_new_alert();

-- Grant execute permission to the authenticated role for the function
-- This is important if the function is called directly by an authenticated user,
-- but in this case, it's called by a trigger, so SECURITY DEFINER is more critical.
-- Still, good practice to ensure permissions.
GRANT EXECUTE ON FUNCTION public.notify_web_push_on_new_alert() TO authenticated;