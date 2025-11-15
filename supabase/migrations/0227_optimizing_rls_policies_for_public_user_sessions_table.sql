-- Optimize 'Users can view their own sessions' policy
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT TO authenticated USING (((select auth.uid()) = user_id));

-- Optimize 'Users can create their own sessions' policy
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.user_sessions;
CREATE POLICY "Users can create their own sessions" ON public.user_sessions
FOR INSERT TO authenticated WITH CHECK (((select auth.uid()) = user_id));

-- Optimize 'Users can update their own sessions' policy
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
CREATE POLICY "Users can update their own sessions" ON public.user_sessions
FOR UPDATE TO authenticated USING (((select auth.uid()) = user_id));

-- Optimize 'Users can delete their own sessions' policy
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;
CREATE POLICY "Users can delete their own sessions" ON public.user_sessions
FOR DELETE TO authenticated USING (((select auth.uid()) = user_id));