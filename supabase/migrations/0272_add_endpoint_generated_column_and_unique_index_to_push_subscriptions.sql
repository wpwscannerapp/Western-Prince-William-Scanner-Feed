-- Add 'endpoint' generated column to public.push_subscriptions
ALTER TABLE public.push_subscriptions
ADD COLUMN endpoint TEXT GENERATED ALWAYS AS (subscription->>'endpoint') STORED;

-- Create a unique index on (user_id, endpoint) to enable ON CONFLICT upserts
CREATE UNIQUE INDEX idx_push_subscriptions_user_endpoint ON public.push_subscriptions(user_id, endpoint);

-- Drop the old unique index if it exists and was created on the expression directly
-- This step is defensive and might not be strictly necessary if 0258 was already correct
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'push_subscriptions'
        AND indexname = 'push_subscriptions_user_id_subscription_endpoint_key' -- Replace with actual old index name if different
    ) THEN
        DROP INDEX public.push_subscriptions_user_id_subscription_endpoint_key;
    END IF;
END
$$;

-- Recreate the unique constraint using the new generated column
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint);