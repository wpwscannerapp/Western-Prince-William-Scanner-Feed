-- This query will run as the currently authenticated user (if you're logged into Supabase)
        SELECT role FROM public.profiles WHERE id = auth.uid();