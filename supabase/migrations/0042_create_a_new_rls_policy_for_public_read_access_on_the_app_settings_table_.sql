CREATE POLICY "Public read access for app settings" ON public.app_settings
FOR SELECT USING (true);