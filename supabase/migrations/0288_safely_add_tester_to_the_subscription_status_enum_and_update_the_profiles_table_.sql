DO $$
BEGIN
    -- Check if the enum type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
        -- Create the enum type if it doesn't exist
        CREATE TYPE public.subscription_status_enum AS ENUM ('free', 'trialing', 'active', 'tester');

        -- Drop the existing default constraint on the column
        ALTER TABLE public.profiles ALTER COLUMN subscription_status DROP DEFAULT;

        -- Alter the column type to the new enum type
        ALTER TABLE public.profiles ALTER COLUMN subscription_status TYPE public.subscription_status_enum USING subscription_status::text::public.subscription_status_enum;

        -- Add a new default constraint using a value from the new enum
        ALTER TABLE public.profiles ALTER COLUMN subscription_status SET DEFAULT 'free'::public.subscription_status_enum;
    ELSE
        -- If the enum type already exists, add 'tester' value if it's not there
        BEGIN
            ALTER TYPE public.subscription_status_enum ADD VALUE 'tester' AFTER 'active';
        EXCEPTION
            WHEN duplicate_object THEN NULL; -- Ignore if 'tester' already exists
        END;
    END IF;
END $$;