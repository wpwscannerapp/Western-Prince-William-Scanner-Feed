-- Add the 'endpoint' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_subscriptions' AND column_name='endpoint') THEN
        ALTER TABLE public.push_subscriptions
        ADD COLUMN endpoint TEXT GENERATED ALWAYS AS (subscription ->> 'endpoint') STORED;
    END IF;
END
$$;

-- Drop the old unique index if it exists (if it was created without 'endpoint')
DROP INDEX IF EXISTS push_subscriptions_user_id_key;

-- Create a unique index on (user_id, endpoint) to prevent duplicate subscriptions for the same user and device
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_id_endpoint_key
ON public.push_subscriptions (user_id, endpoint);

-- Ensure RLS is enabled (if not already)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies for push_subscriptions to recreate them with the new 'endpoint' column
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can select their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role can select all subscriptions" ON public.push_subscriptions;

-- Recreate RLS policies for push_subscriptions
CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND endpoint = (subscription ->> 'endpoint'));

CREATE POLICY "Users can select their own subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policy for service role to access all subscriptions (e.g., for sending notifications)
CREATE POLICY "Service role can select all subscriptions" ON public.push_subscriptions
FOR SELECT TO service_role USING (true);