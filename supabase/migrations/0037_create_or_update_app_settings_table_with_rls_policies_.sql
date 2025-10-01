-- app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  font_family TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  custom_css TEXT,
  layout JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS policies for app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage app_settings" ON app_settings;
CREATE POLICY "Admins can manage app_settings" ON app_settings
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin') -- Assuming 'admin' is the role for administrators
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin')
  ));