DROP POLICY IF EXISTS "Admins can insert incidents" ON public.incidents;
CREATE POLICY "Admins can insert incidents" ON public.incidents 
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));