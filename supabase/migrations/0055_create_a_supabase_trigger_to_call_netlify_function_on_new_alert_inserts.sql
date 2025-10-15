-- This migration updates the trigger to call the new Netlify function name
-- 'send-web-push-notification' instead of 'send-onesignal-notification'.

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_new_alert_send_notification ON public.alerts;

-- Then, drop the existing function if it exists
DROP FUNCTION IF EXISTS public.notify_onesignal_on_new_alert();

-- Recreate the function with the new Netlify function URL
CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $function$
DECLARE
  netlify_function_url TEXT;
  response_status INT;
  response_body TEXT;
BEGIN
  -- IMPORTANT: Replace with your actual Netlify Function URL
  -- Example: 'https://your-netlify-site-name.netlify.app/.netlify/functions/send-web-push-notification'
  netlify_function_url := 'https://wpwscannerapp.com/.netlify/functions/send-web-push-notification'; 

  -- Perform the HTTP POST request to the Netlify Function
  -- Ensure the http extension is enabled in your Supabase project (Database -> Extensions -> http)
  SELECT INTO response_status, response_body
    status, content
  FROM http_post(
    netlify_function_url,
    NEW::jsonb::text,
    '{"Content-Type": "application/json"}'
  );

  RAISE NOTICE 'Netlify Function Response Status: %', response_status;
  RAISE NOTICE 'Netlify Function Response Body: %', response_body;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger to use the new function
CREATE TRIGGER on_new_alert_send_notification
  AFTER INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_web_push_on_new_alert();