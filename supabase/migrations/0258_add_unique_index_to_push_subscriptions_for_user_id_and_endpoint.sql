-- Create a unique index on user_id and the 'endpoint' key within the subscription JSONB column
CREATE UNIQUE INDEX push_subscriptions_user_id_endpoint_idx
ON public.push_subscriptions (user_id, (subscription->>'endpoint'));