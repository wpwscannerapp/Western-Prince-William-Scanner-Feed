-- Re-create the convenient wrapper in public schema with explicit search_path
CREATE OR REPLACE FUNCTION public.http_post(url text, body text, content_type text DEFAULT 'application/json')
RETURNS http_response
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'extensions' -- Explicitly set search_path for security
AS $$
DECLARE
  resp extensions.http_response;
BEGIN
  RETURN extensions.http_post(url := url, body := body, content_type := content_type);
END;
$$;

-- Re-create the other overload with explicit search_path
CREATE OR REPLACE FUNCTION public.http_post(url text, headers jsonb, body text)
RETURNS http_response
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'extensions' -- Explicitly set search_path for security
AS $$
BEGIN
  RETURN extensions.http_post(url := url, headers := headers, body := body);
END;
$$;

-- Grant execute permissions to the public role for both overloads
GRANT EXECUTE ON FUNCTION public.http_post(text, text, text) TO public;
GRANT EXECUTE ON FUNCTION public.http_post(text, jsonb, text) TO public;