-- Function to notify admin via Netlify function on new feedback
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_feedback()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  netlify_function_url TEXT;
  response_status INT;
  response_body TEXT;
BEGIN
  -- Netlify Function URL for sending admin email
  netlify_function_url := 'https://wpwscannerapp.com/.netlify/functions/send-admin-email';

  -- Perform the HTTP POST request to the Netlify Function
  SELECT INTO response_status, response_body
    status, content
  FROM http_post(
    netlify_function_url,
    row_to_json(NEW)::text,
    '{"Content-Type": "application/json"}'
  );

  RAISE NOTICE 'Netlify Function Response Status: %', response_status;
  RAISE NOTICE 'Netlify Function Response Body: %', response_body;

  RETURN NEW;
END;
$$;

-- Trigger the function on new feedback insertion
DROP TRIGGER IF EXISTS on_new_feedback ON public.feedback_and_suggestions;
CREATE TRIGGER on_new_feedback
  AFTER INSERT ON public.feedback_and_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_new_feedback();