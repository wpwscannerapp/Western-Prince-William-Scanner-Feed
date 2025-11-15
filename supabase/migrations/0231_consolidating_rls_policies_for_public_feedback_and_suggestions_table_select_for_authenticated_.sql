-- Drop existing policies for authenticated SELECT on feedback_and_suggestions
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback_and_suggestions;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback_and_suggestions;

-- Recreate a single consolidated policy for authenticated SELECT on feedback_and_suggestions
CREATE POLICY "Authenticated users can view own or all feedback if admin" ON public.feedback_and_suggestions
FOR SELECT TO authenticated USING (
  ((select auth.uid()) = user_id)
  OR
  (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::text))))
);