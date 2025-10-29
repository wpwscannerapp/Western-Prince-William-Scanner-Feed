DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='audio_url') THEN
        ALTER TABLE public.incidents ADD COLUMN audio_url TEXT;
    END IF;
END
$$;