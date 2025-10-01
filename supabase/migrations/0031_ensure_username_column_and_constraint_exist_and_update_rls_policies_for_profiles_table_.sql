-- Drop existing update policies for profiles to avoid conflicts
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Add username column to profiles table if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Drop the check constraint if it already exists before adding it
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS username_not_empty;

-- Add a check constraint to ensure username is not empty
ALTER TABLE public.profiles
ADD CONSTRAINT username_not_empty CHECK (username <> '');

-- Recreate the policy to allow authenticated users to update their own profile, including the new username field
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);