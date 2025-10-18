-- Enable RLS (REQUIRED for security)
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- Policy for authenticated users to read their own profile
    CREATE POLICY "profiles_select_policy" ON public.profiles 
    FOR SELECT TO authenticated USING (auth.uid() = id);

    -- Policy for authenticated users to insert their own profile
    CREATE POLICY "profiles_insert_policy" ON public.profiles 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

    -- Policy for authenticated users to update their own profile
    CREATE POLICY "profiles_update_policy" ON public.profiles 
    FOR UPDATE TO authenticated USING (auth.uid() = id);

    -- Policy for authenticated users to delete their own profile
    CREATE POLICY "profiles_delete_policy" ON public.profiles 
    FOR DELETE TO authenticated USING (auth.uid() = id);