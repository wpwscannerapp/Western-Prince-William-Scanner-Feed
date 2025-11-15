-- Recreate a single consolidated policy for authenticated INSERT on comments
CREATE POLICY "Authenticated users can insert comments or updates" ON public.comments
FOR INSERT TO authenticated WITH CHECK (
  (((select auth.uid()) = user_id) AND (category = 'user'::text))
  OR
  ((category = 'update'::text) AND (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text)))))
);

-- Recreate optimized policy for authenticated SELECT on comments
CREATE POLICY "Authenticated users can view comments" ON public.comments
FOR SELECT TO authenticated USING (true); -- Public read access for authenticated users

-- Recreate optimized policy for authenticated UPDATE on comments
CREATE POLICY "Users can update their own comments" ON public.comments
FOR UPDATE TO authenticated USING (((select auth.uid()) = user_id));

-- Recreate optimized policy for authenticated DELETE on comments
CREATE POLICY "Users can delete their own comments" ON public.comments
FOR DELETE TO authenticated USING (((select auth.uid()) = user_id));