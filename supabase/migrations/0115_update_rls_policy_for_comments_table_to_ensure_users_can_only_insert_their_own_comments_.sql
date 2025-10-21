-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can create their own comments" ON public.comments;

-- Recreate the policy to ensure authenticated users can only insert their own comments
CREATE POLICY "Users can create their own comments" ON public.comments
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);