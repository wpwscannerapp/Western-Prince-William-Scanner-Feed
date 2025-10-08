DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Authenticated users can view comments" ON public.comments
FOR SELECT TO authenticated USING (true);