ALTER TABLE public.profiles
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT;

-- Update RLS policies to allow authenticated users to update their own Stripe IDs
CREATE POLICY "profiles_update_stripe_ids_policy" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);