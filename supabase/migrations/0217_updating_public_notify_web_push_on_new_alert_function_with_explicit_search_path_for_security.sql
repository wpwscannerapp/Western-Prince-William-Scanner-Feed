CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public, extensions' -- Explicitly set search_path to find public.http_post
AS $$
DECLARE
  netlify_function_url TEXT;
  notification_payload JSONB;
  response_status INT;
  response_body TEXT;
BEGIN
  -- Corrected Netlify Function URL to match the file name
  netlify_function_url := 'https://wpwscannerapp.com/.netlify/functions/send-web-push-notification';

  -- Explicitly construct the JSONB payload from the NEW record's columns
  notification_payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'type', NEW.type,
      'latitude', NEW.latitude,
      'longitude', NEW.longitude,
      'description', NEW.description,
      'title', NEW.title,
      'created_at', NEW.created_at
    )
  );

  -- Perform the HTTP POST request to the Netlify Function
  SELECT INTO response_status, response_body
    status, content
  FROM http_post(
    netlify_function_url,
    notification_payload::text, -- Cast the constructed JSONB to text
    '{"Content-Type": "application/json"}'
  );

  RAISE NOTICE 'Netlify Function Response Status: %', response_status;
  RAISE NOTICE 'Netlify Function Response Body: %', response_body;

  RETURN NEW;
END;
$$;