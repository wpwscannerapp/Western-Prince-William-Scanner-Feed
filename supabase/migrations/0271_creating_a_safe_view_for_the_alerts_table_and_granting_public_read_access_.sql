-- Safe view the frontend can always select('*') from
CREATE OR REPLACE VIEW public.alerts_safe AS
SELECT
  id,
  title,
  description,
  type,
  latitude,
  longitude,
  created_at
FROM public.alerts;

-- Give public read access (same as your alerts table had)
GRANT SELECT ON public.alerts_safe TO anon, authenticated;