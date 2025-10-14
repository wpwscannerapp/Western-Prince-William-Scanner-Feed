-- Create a function to call the Netlify Function
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
  -- Replace with your actual Netlify Function URL
  -- You might need to set this as a Supabase secret or environment variable
  netlify_function_url := 'https://your-netlify-site-name.netlify.app/.netlify/functions/send-onesignal-notification'; -- IMPORTANT: Update this URL

  -- Perform the HTTP POST request to the Netlify Function
  SELECT INTO response_status, response_body
    status, content
  FROM http((
    'POST',
    netlify_function_url,
    '{"Content-Type": "application/json"}',
    NEW::jsonb::text,
    NULL
  ));

  RAISE NOTICE 'Netlify Function Response Status: %', response_status;
  RAISE NOTICE 'Netlify Function Response Body: %', response_body;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_new_alert_send_notification
AFTER INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_onesignal_on_new_alert();