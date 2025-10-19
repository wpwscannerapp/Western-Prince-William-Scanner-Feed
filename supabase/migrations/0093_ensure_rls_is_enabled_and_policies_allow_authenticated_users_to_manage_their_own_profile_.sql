ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts during recreation
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete own profile" ON public.profiles;

-- Recreate policies with correct role-based access
CREATE POLICY "Allow authenticated users to read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated users to update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to delete own profile" ON public.profiles
FOR DELETE TO authenticated
USING (auth.uid() = id);