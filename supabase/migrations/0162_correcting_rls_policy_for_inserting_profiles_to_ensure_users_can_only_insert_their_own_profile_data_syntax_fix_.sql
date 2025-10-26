-- Drop the existing insert policy again to ensure a clean slate
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate the insert policy with the correct syntax (only WITH CHECK for INSERT)
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);