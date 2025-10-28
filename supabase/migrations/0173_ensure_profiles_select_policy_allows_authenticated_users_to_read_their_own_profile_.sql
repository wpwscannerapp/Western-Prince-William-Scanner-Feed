-- Drop existing policy if it exists to ensure a clean update
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Create policy to allow authenticated users to read their own profile
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);