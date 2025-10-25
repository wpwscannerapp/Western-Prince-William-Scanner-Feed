-- Create anonymous_incident_reports table
CREATE TABLE public.anonymous_incident_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- e.g., 'pending', 'reviewed', 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.anonymous_incident_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service_role to insert reports (used by Netlify Edge Function)
CREATE POLICY "Service role can insert anonymous reports" ON public.anonymous_incident_reports
FOR INSERT TO service_role WITH CHECK (true);

-- Policy: Admins can view anonymous reports
CREATE POLICY "Admins can view anonymous reports" ON public.anonymous_incident_reports
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Policy: Admins can update anonymous reports (e.g., change status)
CREATE POLICY "Admins can update anonymous reports" ON public.anonymous_incident_reports
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));