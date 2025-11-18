-- Drop all existing RLS policies for public.profiles to ensure a clean slate
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles; -- Added this missing drop statement
DROP POLICY IF EXISTS "Authenticated users can read public profile info" ON public.profiles; -- Ensure this is also dropped if it exists

-- Enable RLS (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to SELECT their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Policy 2: Allow authenticated users to INSERT their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 3: Allow authenticated users to UPDATE their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- Policy 4: Allow authenticated users to DELETE their own profile
CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE TO authenticated
USING (auth.uid() = id);

-- Policy 5: Allow all authenticated users to read limited public profile information (e.g., for comments)
CREATE POLICY "Authenticated users can read public profile info" ON public.profiles
FOR SELECT TO authenticated
USING (true);