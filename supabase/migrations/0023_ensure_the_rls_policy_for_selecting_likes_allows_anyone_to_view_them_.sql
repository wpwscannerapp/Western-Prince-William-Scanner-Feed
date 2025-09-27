DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;
CREATE POLICY "Anyone can view likes" ON public.likes
FOR SELECT USING (true);