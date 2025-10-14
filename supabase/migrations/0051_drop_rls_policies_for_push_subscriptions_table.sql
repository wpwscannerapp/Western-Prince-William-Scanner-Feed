DROP POLICY IF EXISTS "Authenticated users can view their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can insert their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can update their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can delete their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all push subscriptions" ON public.push_subscriptions;