-- 1. Drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_alert_created ON public.alerts;

-- 2. Drop the existing function
DROP FUNCTION IF EXISTS public.notify_web_push_on_new_alert();

-- 3. Recreate the function with updated search_path and hardcoded secret
CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  payload jsonb;
BEGIN
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
    headers := jsonb_build_object('X-Internal-Secret', 'YOUR_WEB_PUSH_INTERNAL_SECRET_HERE') -- REPLACE THIS PLACEHOLDER
  );

  RETURN NEW;
END;
$function$;

-- 4. Recreate the trigger to call the updated function
CREATE TRIGGER on_alert_created
  AFTER INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_web_push_on_new_alert();