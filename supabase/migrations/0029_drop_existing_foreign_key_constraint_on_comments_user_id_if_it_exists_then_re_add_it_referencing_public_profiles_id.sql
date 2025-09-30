DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_id' AND conrelid = 'public.comments'::regclass) THEN
    ALTER TABLE public.comments DROP CONSTRAINT fk_user_id;
  END IF;
END
$$;

ALTER TABLE public.comments
ADD CONSTRAINT fk_user_id
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;