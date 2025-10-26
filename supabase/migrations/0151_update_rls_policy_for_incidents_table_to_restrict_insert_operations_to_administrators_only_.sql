-- Drop the existing policy that currently allows all authenticated users to insert (due to null definition)
DROP POLICY IF EXISTS "Admins can insert incidents" ON public.incidents;

-- Recreate the policy to ensure only users with the 'admin' role can create incidents
CREATE POLICY "Admins can insert incidents" ON public.incidents
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));