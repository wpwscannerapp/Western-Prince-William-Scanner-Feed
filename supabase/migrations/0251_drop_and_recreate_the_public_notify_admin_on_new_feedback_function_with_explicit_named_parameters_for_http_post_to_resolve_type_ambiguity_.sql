-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_new_feedback ON public.feedback_and_suggestions;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.notify_admin_on_new_feedback();

-- Recreate the function with explicit named parameters for http_post
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_feedback()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public, extensions'
AS $function$
DECLARE
  netlify_function_url TEXT;
  request_body TEXT;
  content_type TEXT := 'application/json';
  response_status INT;
  response_body TEXT;
BEGIN
  -- Netlify Function URL for sending admin email
  netlify_function_url := 'https://wpwscannerapp.com/.netlify/functions/send-admin-email';

  -- Prepare the request body as text
  request_body := row_to_json(NEW)::text;

  -- Perform the HTTP POST request to the Netlify Function using named parameters
  SELECT INTO response_status, response_body
    status, content
  FROM public.http_post(
    url := netlify_function_url,
    body := request_body,
    content_type := content_type
  );

  RAISE NOTICE 'Netlify Function Response Status: %', response_status;
  RAISE NOTICE 'Netlify Function Response Body: %', response_body;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_new_feedback
  AFTER INSERT ON public.feedback_and_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_new_feedback();

-- Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.notify_admin_on_new_feedback() TO anon, authenticated;