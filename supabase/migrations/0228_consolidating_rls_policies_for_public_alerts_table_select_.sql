-- Drop redundant policy for public.alerts SELECT
DROP POLICY IF EXISTS "Public read access for alerts" ON public.alerts;