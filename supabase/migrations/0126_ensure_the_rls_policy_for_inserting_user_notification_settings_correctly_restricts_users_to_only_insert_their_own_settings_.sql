-- Drop existing policy if it allows inserting for other users
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON public.user_notification_settings;

-- Recreate policy to ensure users can only insert their own notification settings
CREATE POLICY "Users can insert their own notification settings" ON public.user_notification_settings
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);