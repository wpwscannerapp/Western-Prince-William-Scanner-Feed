-- Drop existing app_settings table and its policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can delete app settings" ON public.app_settings;
DROP TABLE IF EXISTS public.app_settings;

-- Create the new app_settings table with all fields
CREATE TABLE public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_color TEXT NOT NULL DEFAULT '#2196F3',
  secondary_color TEXT NOT NULL DEFAULT '#4CAF50',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  logo_url TEXT,
  favicon_url TEXT,
  custom_css TEXT,
  layout JSONB DEFAULT '[]'::JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies for app_settings
-- Authenticated users can read settings
CREATE POLICY "Authenticated users can read app settings" ON public.app_settings
FOR SELECT TO authenticated USING (true);

-- Admins can insert settings
CREATE POLICY "Admins can insert app settings" ON public.app_settings
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));

-- Admins can update settings
CREATE POLICY "Admins can update app settings" ON public.app_settings
FOR UPDATE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));

-- Admins can delete settings (optional, but good practice)
CREATE POLICY "Admins can delete app settings" ON public.app_settings
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));


-- Drop existing app_settings_history table if it exists
DROP TABLE IF EXISTS public.app_settings_history;

-- Create app_settings_history table for versioning
CREATE TABLE public.app_settings_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settings JSONB NOT NULL, -- Stores a snapshot of all settings
  layout JSONB, -- Redundant if settings JSONB contains it, but user explicitly asked for it. I'll keep it for now.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.app_settings_history ENABLE ROW LEVEL SECURITY;

-- Policies for app_settings_history
-- Authenticated users can read history (e.g., for viewing past states)
CREATE POLICY "Authenticated users can read app settings history" ON public.app_settings_history
FOR SELECT TO authenticated USING (true);

-- Admins can insert history (handled by the app on save)
CREATE POLICY "Admins can insert app settings history" ON public.app_settings_history
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));

-- Admins can delete history (optional)
CREATE POLICY "Admins can delete app settings history" ON public.app_settings_history
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));