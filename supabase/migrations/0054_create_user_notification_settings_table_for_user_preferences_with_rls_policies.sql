-- Create user_notification_settings table
CREATE TABLE public.user_notification_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  onesignal_player_id TEXT,
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  preferred_types TEXT[] DEFAULT '{}'::TEXT[] NOT NULL, -- e.g., ['fire', 'police']
  radius_miles NUMERIC DEFAULT 5 NOT NULL, -- e.g., 1, 5, 10 miles
  latitude NUMERIC,
  longitude NUMERIC,
  manual_location_address TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies for user_notification_settings table
CREATE POLICY "Users can view their own notification settings" ON public.user_notification_settings
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON public.user_notification_settings
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON public.user_notification_settings
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings" ON public.user_notification_settings
FOR DELETE TO authenticated USING (auth.uid() = user_id);