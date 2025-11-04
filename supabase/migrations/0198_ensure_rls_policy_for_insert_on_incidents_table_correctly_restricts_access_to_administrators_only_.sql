-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Admins can insert incidents" ON public.incidents;

-- Recreate the policy to ensure only authenticated users with the 'admin' role can insert incidents
CREATE POLICY "Admins can insert incidents" ON public.incidents
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::text
  )
);