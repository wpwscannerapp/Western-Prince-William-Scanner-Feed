-- Optimize 'Admins can read app_settings_history' policy
DROP POLICY IF EXISTS "Admins can read app_settings_history" ON public.app_settings_history;
CREATE POLICY "Admins can read app_settings_history" ON public.app_settings_history
FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))));

-- Optimize 'Admins can insert app settings history' policy
DROP POLICY IF EXISTS "Admins can insert app settings history" ON public.app_settings_history;
CREATE POLICY "Admins can insert app settings history" ON public.app_settings_history
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))));

-- Optimize 'Admins can delete app settings history' policy
DROP POLICY IF EXISTS "Admins can delete app settings history" ON public.app_settings_history;
CREATE POLICY "Admins can delete app settings history" ON public.app_settings_history
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))));