CREATE POLICY "Allow authenticated users to read public profile info" ON public.profiles
FOR SELECT TO authenticated USING (true);