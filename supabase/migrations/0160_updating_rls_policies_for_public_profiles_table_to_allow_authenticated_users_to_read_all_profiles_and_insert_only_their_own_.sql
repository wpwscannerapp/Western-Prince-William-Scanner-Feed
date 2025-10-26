-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Recreate policies with corrected definitions

-- Allow authenticated users to read all profiles (for displaying usernames/avatars in comments, etc.)
CREATE POLICY "Authenticated users can read all profiles" ON public.profiles
FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert only their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update only their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Allow authenticated users to delete only their own profile
CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE TO authenticated USING (auth.uid() = id);