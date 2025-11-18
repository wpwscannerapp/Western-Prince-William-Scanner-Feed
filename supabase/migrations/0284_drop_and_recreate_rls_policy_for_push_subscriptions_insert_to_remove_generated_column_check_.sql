-- Drop the existing RLS policy for inserting push subscriptions
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;

-- Recreate the RLS policy for inserting push subscriptions, removing the 'endpoint' check
CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);