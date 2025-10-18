-- Enable RLS (REQUIRED for security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read public profile info" ON public.profiles;

-- Create a new SELECT policy: Users can only see their own data
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

-- Ensure INSERT policy is correct
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Ensure UPDATE policies are correct
DROP POLICY IF EXISTS "profiles_update_stripe_ids_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Ensure DELETE policy is correct
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE TO authenticated USING (auth.uid() = id);