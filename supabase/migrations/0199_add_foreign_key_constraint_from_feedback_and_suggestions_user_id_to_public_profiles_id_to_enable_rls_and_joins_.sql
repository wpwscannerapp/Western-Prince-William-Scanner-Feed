-- Drop the existing foreign key constraint referencing auth.users if it exists
ALTER TABLE public.feedback_and_suggestions DROP CONSTRAINT IF EXISTS feedback_and_suggestions_user_id_fkey;

-- Add a new foreign key constraint referencing public.profiles.id
ALTER TABLE public.feedback_and_suggestions
ADD CONSTRAINT feedback_and_suggestions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;