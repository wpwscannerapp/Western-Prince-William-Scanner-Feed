-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Allow public feedback submission" ON public.feedback_and_suggestions;

-- Recreate the exact same INSERT policy to force API endpoint refresh
CREATE POLICY "Allow public feedback submission" ON public.feedback_and_suggestions
FOR INSERT WITH CHECK (true);