-- Ensure RLS is enabled
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop the redundant policy if it exists
DROP POLICY IF EXISTS "Authenticated users can read app settings" ON public.app_settings;

-- Drop the existing public read policy if it exists, so we can recreate it cleanly
DROP POLICY IF EXISTS "Public read access for app settings" ON public.app_settings;

-- Create the public read policy
CREATE POLICY "Public read access for app settings" ON public.app_settings 
FOR SELECT USING (true);