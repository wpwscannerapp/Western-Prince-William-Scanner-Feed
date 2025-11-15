-- Optimize 'Admins can view all feedback' policy
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback_and_suggestions;
CREATE POLICY "Admins can view all feedback" ON public.feedback_and_suggestions
FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))));

-- Optimize 'Users can view their own feedback' policy
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback_and_suggestions;
CREATE POLICY "Users can view their own feedback" ON public.feedback_and_suggestions
FOR SELECT TO authenticated USING (((select auth.uid()) = user_id));

-- Optimize 'Users can insert their own feedback with contact info' policy
DROP POLICY IF EXISTS "Users can insert their own feedback with contact info" ON public.feedback_and_suggestions;
CREATE POLICY "Users can insert their own feedback with contact info" ON public.feedback_and_suggestions
FOR INSERT TO authenticated WITH CHECK (((select auth.uid()) = user_id));