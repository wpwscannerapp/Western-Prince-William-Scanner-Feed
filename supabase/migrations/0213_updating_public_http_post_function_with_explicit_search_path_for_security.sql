-- Create a convenient wrapper in public schema so your existing functions keep working without changes
create or replace function public.http_post(url text, body text, content_type text default 'application/json')
returns http_response
language plpgsql
security definer
set search_path = 'extensions' -- Explicitly set search_path for security
as $$
declare
  resp extensions.http_response;
begin
  select * into resp 
  from extensions.http_post(url, body, content_type);
  return resp;
end;
$$;

-- Also create the other overloads your functions might be using
create or replace function public.http_post(url text, headers jsonb, body text)
returns http_response
language plpgsql
security definer
set search_path = 'extensions' -- Explicitly set search_path for security
as $$
begin
  return extensions.http_post(url := url, headers := headers, body := body);
end;
$$;