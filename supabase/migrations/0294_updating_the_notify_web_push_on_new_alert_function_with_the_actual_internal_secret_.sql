CREATE OR REPLACE FUNCTION public.notify_web_push_on_new_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'net', 'supabase_vault'
AS $function$
DECLARE
  payload jsonb;
  request_id bigint;
  internal_secret text;
BEGIN
  -- Retrieve the internal secret from Supabase Vault
  SELECT supabase_vault.get_secret('WEB_PUSH_INTERNAL_SECRET') INTO internal_secret;

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

  SELECT net.http_post(
    url := 'https://wvvxkwvliogulfqmkaqb.supabase.co/functions/v1/send-push-notification',
    body := payload,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', internal_secret -- Use the internal secret for authentication
    ),
    timeout_milliseconds := 10000
  ) INTO request_id;

  RAISE NOTICE 'Push queued: request_id %', request_id;
  RETURN NEW;
END;
$function$;