-- app_settings_history table
CREATE TABLE IF NOT EXISTS app_settings_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settings JSONB NOT NULL,
  layout JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS policies for app_settings_history
ALTER TABLE app_settings_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read app_settings_history" ON app_settings_history;
CREATE POLICY "Admins can read app_settings_history" ON app_settings_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin')
  ));
DROP POLICY IF EXISTS "Admins can insert app settings history" ON app_settings_history;
CREATE POLICY "Admins can insert app settings history" ON public.app_settings_history 
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));
DROP POLICY IF EXISTS "Admins can delete app settings history" ON app_settings_history;
CREATE POLICY "Admins can delete app settings history" ON public.app_settings_history 
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));