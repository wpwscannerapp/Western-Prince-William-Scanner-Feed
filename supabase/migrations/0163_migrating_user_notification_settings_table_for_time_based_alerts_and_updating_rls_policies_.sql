-- Drop existing RLS policies for user_notification_settings
DROP POLICY IF EXISTS "Users can update their own notification settings" ON public.user_notification_settings;
DROP POLICY IF EXISTS "Users can view their own notification settings" ON public.user_notification_settings;
DROP POLICY IF EXISTS "Users can delete their own notification settings" ON public.user_notification_settings;
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON public.user_notification_settings;

-- Alter table to remove old columns and add new ones
ALTER TABLE public.user_notification_settings
DROP COLUMN IF EXISTS preferred_types,
DROP COLUMN IF EXISTS radius_miles,
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude,
DROP COLUMN IF EXISTS manual_location_address;

ALTER TABLE public.user_notification_settings
ADD COLUMN receive_all_alerts BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN preferred_start_time TIME WITH TIME ZONE,
ADD COLUMN preferred_end_time TIME WITH TIME ZONE,
ADD COLUMN preferred_days TEXT[] NOT NULL DEFAULT '{}';

-- Recreate RLS policies for user_notification_settings with new columns
CREATE POLICY "Users can view their own notification settings" ON public.user_notification_settings
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON public.user_notification_settings
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON public.user_notification_settings
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings" ON public.user_notification_settings
FOR DELETE TO authenticated USING (auth.uid() = user_id);