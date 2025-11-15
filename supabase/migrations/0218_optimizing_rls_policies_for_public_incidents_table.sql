-- Optimize 'Admins can update incidents' policy
DROP POLICY IF EXISTS "Admins can update incidents" ON public.incidents;
CREATE POLICY "Admins can update incidents" ON public.incidents
FOR UPDATE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))));

-- Optimize 'Admins can delete incidents' policy
DROP POLICY IF EXISTS "Admins can delete incidents" ON public.incidents;
CREATE POLICY "Admins can delete incidents" ON public.incidents
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))));

-- Optimize 'Admins can insert incidents' policy
DROP POLICY IF EXISTS "Admins can insert incidents" ON public.incidents;
CREATE POLICY "Admins can insert incidents" ON public.incidents
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))));