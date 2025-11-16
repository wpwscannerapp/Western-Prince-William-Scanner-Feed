-- Drop all existing RLS policies for the feedback_and_suggestions table
DROP POLICY IF EXISTS "Allow public feedback submission" ON public.feedback_and_suggestions;
DROP POLICY IF EXISTS "Authenticated users can view own or all feedback if admin" ON public.feedback_and_suggestions;
DROP POLICY IF EXISTS "Admins can update feedback and suggestions" ON public.feedback_and_suggestions;
DROP POLICY IF EXISTS "Admins can delete feedback and suggestions" ON public.feedback_and_suggestions;
DROP POLICY IF EXISTS "Enable authenticated read access for feedback" ON public.feedback_and_suggestions; -- Drop the one from the previous step if it was created

-- Policy to allow public users to insert feedback (anonymous submissions)
CREATE POLICY "Allow public feedback submission"
ON public.feedback_and_suggestions
FOR INSERT
TO public
WITH CHECK (true);

-- Policy to allow authenticated users to view their own feedback, and admins to view all feedback
CREATE POLICY "Authenticated users can view own or all feedback if admin"
ON public.feedback_and_suggestions
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
);

-- Policy to allow administrators to update feedback
CREATE POLICY "Admins can update feedback and suggestions"
ON public.feedback_and_suggestions
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Policy to allow administrators to delete feedback
CREATE POLICY "Admins can delete feedback and suggestions"
ON public.feedback_and_suggestions
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));