-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can insert incidents" ON public.incidents;

-- Recreate the policy to allow only authenticated administrators to insert incidents
CREATE POLICY "Admins can insert incidents" ON public.incidents
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));