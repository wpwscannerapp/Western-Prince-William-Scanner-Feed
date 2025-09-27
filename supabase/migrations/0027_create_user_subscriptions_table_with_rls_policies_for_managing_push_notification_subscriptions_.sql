-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for user_subscriptions table
-- Users can only see their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can only insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions" ON public.user_subscriptions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can only update their own subscriptions (e.g., if endpoint changes, though usually new subscription is created)
CREATE POLICY "Users can update their own subscriptions" ON public.user_subscriptions
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can only delete their own subscriptions
CREATE POLICY "Users can delete their own subscriptions" ON public.user_subscriptions
FOR DELETE TO authenticated USING (auth.uid() = user_id);