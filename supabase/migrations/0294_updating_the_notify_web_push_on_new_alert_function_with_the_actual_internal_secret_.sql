CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  payload jsonb;
  -- IMPORTANT: Replace 'YOUR_WEB_PUSH_INTERNAL_SECRET_HERE' with the actual secret value you generated.
  -- This secret is used to authenticate the call to the Edge Function.
  -- Since PostgreSQL functions cannot directly access Supabase secrets (like pg_vault),
  -- it must be hardcoded here.
  --
  -- Ensure this function is SECURITY DEFINER and its definition is protected.
  -- You can generate a strong secret using `crypto.randomUUID()` in your browser console.
  -- Example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
  -- Also ensure this secret is set in your Edge Function's environment variables.
  --
  -- For security, you MUST replace the placeholder below with your actual secret.
  -- DO NOT commit your actual secret to version control.
  -- If you change the secret in Supabase, you MUST update it here as well.
  internal_secret TEXT := 'YOUR_WEB_PUSH_INTERNAL_SECRET_HERE'; -- REPLACE THIS PLACEHOLDER
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
    uri := 'https://wvvxkwvliogulfqmkaqb.supabase.co/functions/v1/send-push-notification',
    body := payload::text,
    content_type := 'application/json',
    headers := jsonb_build_object('X-Internal-Secret', internal_secret)
  );

  RETURN NEW;
END;
$function$;