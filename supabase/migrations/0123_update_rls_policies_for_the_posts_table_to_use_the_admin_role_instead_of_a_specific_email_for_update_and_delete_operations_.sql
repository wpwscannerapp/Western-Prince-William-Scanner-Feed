-- Drop existing policies for public.posts that use specific email
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;

-- Recreate policies for public.posts using the 'admin' role
CREATE POLICY "Admins can delete posts" ON public.posts
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update posts" ON public.posts
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));