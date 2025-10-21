-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read app settings history" ON public.app_settings_history;