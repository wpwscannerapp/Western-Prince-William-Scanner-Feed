-- Drop the existing onesignal_player_id column
ALTER TABLE public.user_notification_settings
DROP COLUMN IF EXISTS onesignal_player_id;

-- Add the new push_subscription column to store native push subscription objects
ALTER TABLE public.user_notification_settings
ADD COLUMN push_subscription JSONB;

-- Update RLS policies to reflect the schema change (if necessary, though existing user_id policies should still apply)
-- Ensure users can update their own push_subscription
DROP POLICY IF EXISTS "Users can update their own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can update their own notification settings" ON public.user_notification_settings
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ensure users can insert their own notification settings (including push_subscription)
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can insert their own notification settings" ON public.user_notification_settings
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);