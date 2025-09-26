ALTER TABLE public.profiles
ADD COLUMN role TEXT DEFAULT 'user';

-- Update existing profiles to have a 'user' role if the column was just added
UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL;