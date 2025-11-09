-- Drop existing foreign key constraint if it exists (it currently references auth.users)
ALTER TABLE public.feedback_and_suggestions DROP CONSTRAINT IF EXISTS feedback_and_suggestions_user_id_fkey;

-- Recreate the foreign key constraint to reference public.profiles(id)
ALTER TABLE public.feedback_and_suggestions
ADD CONSTRAINT feedback_and_suggestions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;