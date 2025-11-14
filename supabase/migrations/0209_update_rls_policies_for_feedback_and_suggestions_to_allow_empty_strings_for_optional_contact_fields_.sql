-- Drop existing policies to allow recreation with updated logic
DROP POLICY IF EXISTS "Users can insert their own feedback with contact info" ON public.feedback_and_suggestions;
DROP POLICY IF EXISTS "Anonymous users can insert feedback with contact info" ON public.feedback_and_suggestions;

-- Recreate policy for authenticated users to insert their own feedback
CREATE POLICY "Users can insert their own feedback with contact info" ON public.feedback_and_suggestions
FOR INSERT TO authenticated WITH CHECK (
  (auth.uid() = user_id) AND
  ((contact_email IS NULL) OR (contact_email = '') OR (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'::text)) AND
  ((contact_phone IS NULL) OR (contact_phone = '') OR (contact_phone ~* '^\\+?[0-9\\s\\-()]{7,20}$'::text))
);

-- Recreate policy for anonymous users to insert feedback
CREATE POLICY "Anonymous users can insert feedback with contact info" ON public.feedback_and_suggestions
FOR INSERT TO public WITH CHECK (
  (user_id IS NULL) AND
  ((contact_email IS NULL) OR (contact_email = '') OR (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'::text)) AND
  ((contact_phone IS NULL) OR (contact_phone = '') OR (contact_phone ~* '^\\+?[0-9\\s\\-()]{7,20}$'::text))
);