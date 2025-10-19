-- First, ensure RLS is enabled on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies on the profiles table to avoid conflicts
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile data" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile data" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile data" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile data" ON public.profiles;

-- Recreate a clean set of RLS policies for user-specific access

-- Policy for authenticated users to SELECT their own profile
CREATE POLICY "Allow authenticated users to read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Policy for authenticated users to INSERT their own profile
CREATE POLICY "Allow authenticated users to insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy for authenticated users to UPDATE their own profile
CREATE POLICY "Allow authenticated users to update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- Policy for authenticated users to DELETE their own profile
CREATE POLICY "Allow authenticated users to delete own profile" ON public.profiles
FOR DELETE TO authenticated
USING (auth.uid() = id);

-- Optional: If you need public read access for *some* profile fields (e.g., username, avatar_url)
-- but not sensitive data, you would add another SELECT policy here.
-- For now, we'll keep it strictly user-specific.

-- Verify the policies are active
SELECT * FROM pg_policies WHERE tablename = 'profiles';