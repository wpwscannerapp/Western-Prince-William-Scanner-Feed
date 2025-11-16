-- Drop old table if it somehow still exists
DROP TABLE IF EXISTS public.push_subscriptions;

-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique index on user_id and subscription endpoint
CREATE UNIQUE INDEX push_subscriptions_user_endpoint_idx ON public.push_subscriptions (user_id, (subscription->>'endpoint'));

-- Enable RLS (REQUIRED)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only select their own subscriptions
CREATE POLICY "Users can select their own subscriptions" ON public.push_subscriptions 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Policy: Users can only delete their own subscriptions
CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions 
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policy: Service role can select all subscriptions (for sending notifications)
CREATE POLICY "Service role can select all subscriptions" ON public.push_subscriptions 
FOR SELECT TO service_role USING (true);