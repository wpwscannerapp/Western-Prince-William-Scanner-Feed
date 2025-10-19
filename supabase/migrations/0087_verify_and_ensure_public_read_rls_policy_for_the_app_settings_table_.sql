-- Enable RLS on the app_settings table if not already enabled
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop any existing public read policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access for app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public read access" ON public.app_settings;

-- Create a new policy to allow public read access for app_settings
CREATE POLICY "Public read access for app settings" ON public.app_settings
FOR SELECT
USING (true);

-- Verify the policy is active
SELECT * FROM pg_policies WHERE tablename = 'app_settings';