-- Optimize 'Admins can insert contact settings' policy
DROP POLICY IF EXISTS "Admins can insert contact settings" ON public.contact_settings;
CREATE POLICY "Admins can insert contact settings" ON public.contact_settings
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))));

-- Optimize 'Admins can update contact settings' policy
DROP POLICY IF EXISTS "Admins can update contact settings" ON public.contact_settings;
CREATE POLICY "Admins can update contact settings" ON public.contact_settings
FOR UPDATE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))));

-- Optimize 'Admins can delete contact settings' policy
DROP POLICY IF EXISTS "Admins can delete contact settings" ON public.contact_settings;
CREATE POLICY "Admins can delete contact settings" ON public.contact_settings
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))));