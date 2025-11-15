-- Re-create the http_post function for (url text, body text, content_type text)
CREATE OR REPLACE FUNCTION public.http_post(url text, body text, content_type text)
RETURNS http_response
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'extensions'
AS $$
BEGIN
  RETURN extensions.http_post(url := url, body := body, content_type := content_type);
END;
$$;

-- Re-create the http_post function for (url text, headers jsonb, body text)
CREATE OR REPLACE FUNCTION public.http_post(url text, headers jsonb, body text)
RETURNS http_response
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'extensions'
AS $$
BEGIN
  RETURN extensions.http_post(url := url, headers := headers, body := body);
END;
$$;

-- Grant execute permissions to the public role for both overloads
GRANT EXECUTE ON FUNCTION public.http_post(text, text, text) TO public;
GRANT EXECUTE ON FUNCTION public.http_post(text, jsonb, text) TO public;