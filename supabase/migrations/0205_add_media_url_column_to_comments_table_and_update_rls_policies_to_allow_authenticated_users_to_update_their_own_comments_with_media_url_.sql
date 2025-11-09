-- Add media_url column
ALTER TABLE public.comments ADD COLUMN media_url TEXT NULL;

-- Drop existing UPDATE policy to include media_url check
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;

-- Recreate UPDATE policy to allow users to update their own comments (including media_url)
CREATE POLICY "Users can update their own comments" ON public.comments 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);