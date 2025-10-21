-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Admins can insert alerts" ON public.alerts;

-- Recreate the policy to ensure only administrators can insert alerts
CREATE POLICY "Admins can insert alerts" ON public.alerts
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));