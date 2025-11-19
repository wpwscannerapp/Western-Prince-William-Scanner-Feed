CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  payload jsonb;
  internal_secret TEXT := '$$WEB_PUSH_INTERNAL_SECRET_VALUE$$'; -- IMPORTANT: REPLACE THIS WITH YOUR ACTUAL SECRET
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
    headers := jsonb_build_object('X-Internal-Secret', internal_secret) -- NEW: Include internal secret header
  );

  RETURN NEW;
END;
$function$;