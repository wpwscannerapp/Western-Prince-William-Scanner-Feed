-- Update the policy for inserting posts to only allow the admin email
DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;
CREATE POLICY "Admins can insert posts" ON public.posts
FOR INSERT TO authenticated WITH CHECK (auth.email() = 'wpwscannerfeed@gmail.com');

-- Update the policy for deleting posts to only allow the admin email
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
CREATE POLICY "Admins can delete posts" ON public.posts
FOR DELETE TO authenticated USING (auth.email() = 'wpwscannerfeed@gmail.com');

-- Update the policy for updating posts to only allow the admin email
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
CREATE POLICY "Admins can update posts" ON public.posts
FOR UPDATE TO authenticated USING (auth.email() = 'wpwscannerfeed@gmail.com');