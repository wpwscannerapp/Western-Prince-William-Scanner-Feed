-- Add new columns for contact information and contact preference
ALTER TABLE public.feedback_and_suggestions
ADD COLUMN contact_email TEXT,
ADD COLUMN contact_phone TEXT,
ADD COLUMN allow_contact BOOLEAN DEFAULT FALSE;

-- Update RLS policies to allow authenticated users to insert their own contact info
-- and for admins to view all feedback, including new contact fields.

-- Drop existing insert policy if it exists to recreate it with new columns
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON public.feedback_and_suggestions;
DROP POLICY IF EXISTS "Anonymous users can insert feedback" ON public.feedback_and_suggestions;

-- Recreate insert policy for authenticated users
CREATE POLICY "Users can insert their own feedback with contact info" ON public.feedback_and_suggestions
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id) AND
  (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$') AND
  (contact_phone IS NULL OR contact_phone ~* '^\\+?[0-9\\s\\-()]{7,20}$')
);

-- Recreate insert policy for anonymous users (if user_id is null)
CREATE POLICY "Anonymous users can insert feedback with contact info" ON public.feedback_and_suggestions
FOR INSERT
WITH CHECK (
  (user_id IS NULL) AND
  (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$') AND
  (contact_phone IS NULL OR contact_phone ~* '^\\+?[0-9\\s\\-()]{7,20}$')
);

-- Update select policy for admins to view all feedback
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback_and_suggestions;
CREATE POLICY "Admins can view all feedback" ON public.feedback_and_suggestions
FOR SELECT TO authenticated
USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));

-- Update select policy for users to view their own feedback
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback_and_suggestions;
CREATE POLICY "Users can view their own feedback" ON public.feedback_and_suggestions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);