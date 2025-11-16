-- Drop existing http_post functions to avoid conflicts
DROP FUNCTION IF EXISTS public.http_post(text, text, text);
DROP FUNCTION IF EXISTS public.http_post(text, jsonb, text);

-- Recreate public.http_post(url text, body text, content_type text) with corrected parameter name
CREATE OR REPLACE FUNCTION public.http_post(url text, body text, content_type text)
 RETURNS extensions.http_response
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'extensions'
AS $function$
BEGIN
  RETURN extensions.http_post(url := url, body := body, content_type := content_type);
END;
$function$;

-- Recreate public.http_post(url text, headers jsonb, body text) with corrected parameter name
CREATE OR REPLACE FUNCTION public.http_post(url text, headers jsonb, body text)
 RETURNS extensions.http_response
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'extensions'
AS $function$
BEGIN
  RETURN extensions.http_post(url := url, headers := headers, body := body);
END;
$function$;

-- Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.http_post(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.http_post(text, jsonb, text) TO anon, authenticated;