-- Create app_settings table
CREATE TABLE public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_name TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all app settings (global settings)
CREATE POLICY "Authenticated users can read app settings" ON public.app_settings
FOR SELECT TO authenticated USING (true);

-- Policy: Admins can insert new app settings
CREATE POLICY "Admins can insert app settings" ON public.app_settings
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Policy: Admins can update app settings
CREATE POLICY "Admins can update app settings" ON public.app_settings
FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Policy: Admins can delete app settings
CREATE POLICY "Admins can delete app settings" ON public.app_settings
FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Insert default primary color setting
INSERT INTO public.app_settings (setting_name, setting_value)
VALUES ('primary_color', '#2196F3') -- Default blue color
ON CONFLICT (setting_name) DO NOTHING;