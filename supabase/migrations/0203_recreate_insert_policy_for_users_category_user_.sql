CREATE POLICY "Users can create their own comments" ON public.comments 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND category = 'user');