-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can like their own posts" ON public.likes;

-- Recreate the policy to ensure users can only insert their own likes
CREATE POLICY "Users can like their own posts" ON public.likes
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);