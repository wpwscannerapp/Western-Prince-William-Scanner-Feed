CREATE POLICY "Users can create their own sessions" ON public.user_sessions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);