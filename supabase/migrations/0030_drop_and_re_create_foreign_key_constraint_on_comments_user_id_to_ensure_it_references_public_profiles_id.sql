-- Drop existing foreign key constraint on comments.user_id if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.comments'::regclass
      AND conname = 'comments_user_id_fkey' -- Common default name for FK
  ) THEN
    ALTER TABLE public.comments DROP CONSTRAINT comments_user_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.comments'::regclass
      AND conname = 'fk_user_id' -- Custom name used previously
  ) THEN
    ALTER TABLE public.comments DROP CONSTRAINT fk_user_id;
  END IF;
END
$$;

-- Add foreign key constraint from comments.user_id to public.profiles.id
ALTER TABLE public.comments
ADD CONSTRAINT fk_comments_user_id_profiles
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;