-- Add parent_comment_id column to comments table (will fail if already added, but that's fine)
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Drop existing RLS policies using their exact names
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create their own comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;

-- Recreate RLS policies

-- Authenticated users can view all comments (including nested ones)
CREATE POLICY "Authenticated users can view comments" ON public.comments 
FOR SELECT TO authenticated USING (true);

-- Users can create their own comments (including replies)
CREATE POLICY "Users can create their own comments" ON public.comments 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON public.comments 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON public.comments 
FOR DELETE TO authenticated USING (auth.uid() = user_id);