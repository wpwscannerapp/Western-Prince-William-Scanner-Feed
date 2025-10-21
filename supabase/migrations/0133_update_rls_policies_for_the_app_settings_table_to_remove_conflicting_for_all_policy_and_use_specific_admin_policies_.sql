-- Drop conflicting 'FOR ALL' policy
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;
-- Drop existing specific admin policies to recreate them cleanly
DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can delete app settings" ON public.app_settings;

-- Recreate specific admin policies for app_settings
CREATE POLICY "Admins can insert app settings" ON public.app_settings
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update app settings" ON public.app_settings
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete app settings" ON public.app_settings
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));