-- Create function to notify Netlify Function on new alert inserts
CREATE OR REPLACE FUNCTION public.notify_onesignal_on_new_alert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  netlify_function_url TEXT;
  response_status INT;
  response_body TEXT;
BEGIN
  -- IMPORTANT: Replace with your actual Netlify Function URL
  -- Example: 'https://your-netlify-site-name.netlify.app/.netlify/functions/send-onesignal-notification'
  netlify_function_url := 'https://YOUR_NETLIFY_SITE_NAME.netlify.app/.netlify/functions/send-onesignal-notification'; 

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
$$;

-- Trigger the function on new alert creation
DROP TRIGGER IF EXISTS on_new_alert_send_notification ON public.alerts;
CREATE TRIGGER on_new_alert_send_notification
  AFTER INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_onesignal_on_new_alert();