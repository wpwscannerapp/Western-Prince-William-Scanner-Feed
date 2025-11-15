-- Optimize 'Users can update their own profile' policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (((select auth.uid()) = id));

-- Optimize 'Users can delete their own profile' policy
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE TO authenticated USING (((select auth.uid()) = id));

-- Optimize 'Users can insert their own profile' policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (((select auth.uid()) = id));

-- Optimize 'profiles_select_policy' policy
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated USING (((select auth.uid()) = id));