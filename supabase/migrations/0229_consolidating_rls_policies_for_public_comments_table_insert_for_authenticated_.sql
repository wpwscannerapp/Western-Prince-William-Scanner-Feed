-- Drop existing policies for authenticated INSERT on comments
DROP POLICY IF EXISTS "Users can create their own comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can create incident updates" ON public.comments;

-- Recreate a single consolidated policy for authenticated INSERT on comments
CREATE POLICY "Authenticated users can insert comments or updates" ON public.comments
FOR INSERT TO authenticated WITH CHECK (
  (((select auth.uid()) = user_id) AND (category = 'user'::text))
  OR
  ((category = 'update'::text) AND (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text)))))
);