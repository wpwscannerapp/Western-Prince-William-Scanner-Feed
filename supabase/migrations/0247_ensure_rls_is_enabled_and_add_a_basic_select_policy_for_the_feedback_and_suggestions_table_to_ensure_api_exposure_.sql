-- Ensure RLS is enabled on the table
ALTER TABLE public.feedback_and_suggestions ENABLE ROW LEVEL SECURITY;

-- Add a basic policy to allow authenticated users to read feedback (this might be redundant with existing policies but helps ensure API exposure)
CREATE POLICY "Enable authenticated read access for feedback"
ON public.feedback_and_suggestions
FOR SELECT TO authenticated
USING (true);