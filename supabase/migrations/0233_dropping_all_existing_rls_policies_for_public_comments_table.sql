-- Drop all existing RLS policies for public.comments
DROP POLICY IF EXISTS "Authenticated users can insert comments or updates" ON public.comments;
DROP POLICY IF EXISTS "Users can create their own comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can create incident updates" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;