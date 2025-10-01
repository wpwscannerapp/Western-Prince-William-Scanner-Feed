-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription JSONB NOT NULL, -- Stores the full PushSubscription object
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add a unique constraint on user_id and subscription endpoint to prevent duplicate subscriptions
CREATE UNIQUE INDEX ON public.push_subscriptions ((subscription->>'endpoint'), user_id);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users to manage their own subscriptions
CREATE POLICY "Authenticated users can view their own push subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own push subscriptions" ON public.push_subscriptions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own push subscriptions" ON public.push_subscriptions
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own push subscriptions" ON public.push_subscriptions
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policy for service_role to manage all subscriptions (e.g., for sending notifications)
CREATE POLICY "Service role can manage all push subscriptions" ON public.push_subscriptions
FOR ALL TO service_role USING (true) WITH CHECK (true);