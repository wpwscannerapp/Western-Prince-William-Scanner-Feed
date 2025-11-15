-- Optimize 'Users can like their own incidents' policy
DROP POLICY IF EXISTS "Users can like their own incidents" ON public.likes;
CREATE POLICY "Users can like their own incidents" ON public.likes
FOR INSERT TO authenticated WITH CHECK (((select auth.uid()) = user_id));

-- Optimize 'Users can unlike their own incidents' policy
DROP POLICY IF EXISTS "Users can unlike their own incidents" ON public.likes;
CREATE POLICY "Users can unlike their own incidents" ON public.likes
FOR DELETE TO authenticated USING (((select auth.uid()) = user_id));