-- Drop policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.user_subscriptions;

-- Disable RLS before dropping table
ALTER TABLE public.user_subscriptions DISABLE ROW LEVEL SECURITY;

-- Drop the user_subscriptions table
DROP TABLE IF EXISTS public.user_subscriptions;