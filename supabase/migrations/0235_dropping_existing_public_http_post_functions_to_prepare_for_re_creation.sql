-- Drop existing http_post functions to avoid conflicts and ensure clean re-creation
DROP FUNCTION IF EXISTS public.http_post(text, text, text);
DROP FUNCTION IF EXISTS public.http_post(text, jsonb, text);