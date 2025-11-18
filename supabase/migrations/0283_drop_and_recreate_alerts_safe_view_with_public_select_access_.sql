-- Drop the existing alerts_safe view if it exists
DROP VIEW IF EXISTS public.alerts_safe;

-- Recreate the alerts_safe view
CREATE VIEW public.alerts_safe AS
SELECT
  id,
  title,
  description,
  type,
  latitude,
  longitude,
  created_at
FROM public.alerts;

-- Grant public read access to the alerts_safe view
GRANT SELECT ON public.alerts_safe TO anon, authenticated;