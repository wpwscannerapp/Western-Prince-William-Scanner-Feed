CREATE POLICY "Users can like their own posts" ON public.likes
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);