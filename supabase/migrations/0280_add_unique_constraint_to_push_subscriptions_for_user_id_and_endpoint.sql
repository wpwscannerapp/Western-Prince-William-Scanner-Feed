-- Add a unique constraint to ensure that a user can only have one subscription per endpoint.
-- This is crucial for the ON CONFLICT clause in the upsert operation.
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_endpoint_key UNIQUE (user_id, endpoint);