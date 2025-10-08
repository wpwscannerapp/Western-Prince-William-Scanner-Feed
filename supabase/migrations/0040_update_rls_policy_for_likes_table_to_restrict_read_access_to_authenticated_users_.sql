DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;
CREATE POLICY "Authenticated users can view likes" ON public.likes
FOR SELECT TO authenticated USING (true);