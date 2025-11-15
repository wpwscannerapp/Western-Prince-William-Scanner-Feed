-- Optimize 'Users can view their own notification settings' policy
DROP POLICY IF EXISTS "Users can view their own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can view their own notification settings" ON public.user_notification_settings
FOR SELECT TO authenticated USING (((select auth.uid()) = user_id));

-- Optimize 'Users can insert their own notification settings' policy
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can insert their own notification settings" ON public.user_notification_settings
FOR INSERT TO authenticated WITH CHECK (((select auth.uid()) = user_id));

-- Optimize 'Users can update their own notification settings' policy
DROP POLICY IF EXISTS "Users can update their own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can update their own notification settings" ON public.user_notification_settings
FOR UPDATE TO authenticated USING (((select auth.uid()) = user_id));

-- Optimize 'Users can delete their own notification settings' policy
DROP POLICY IF EXISTS "Users can delete their own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can delete their own notification settings" ON public.user_notification_settings
FOR DELETE TO authenticated USING (((select auth.uid()) = user_id));