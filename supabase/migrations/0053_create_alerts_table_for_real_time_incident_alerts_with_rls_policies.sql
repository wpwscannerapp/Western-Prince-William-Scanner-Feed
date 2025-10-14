-- Create alerts table
CREATE TABLE public.alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- e.g., 'fire', 'police', 'road_closure', 'medical'
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  description TEXT NOT NULL,
  title TEXT NOT NULL, -- Added for notification title
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Policies for alerts table
CREATE POLICY "Public read access for alerts" ON public.alerts
FOR SELECT USING (true);

CREATE POLICY "Admins can insert alerts" ON public.alerts
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'))));

CREATE POLICY "Admins can update alerts" ON public.alerts
FOR UPDATE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'))));

CREATE POLICY "Admins can delete alerts" ON public.alerts
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'))));