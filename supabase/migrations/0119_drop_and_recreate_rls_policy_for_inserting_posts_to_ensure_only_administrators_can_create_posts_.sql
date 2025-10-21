-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;

-- Recreate the policy to ensure only administrators can insert posts
CREATE POLICY "Admins can insert posts" ON public.posts
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));