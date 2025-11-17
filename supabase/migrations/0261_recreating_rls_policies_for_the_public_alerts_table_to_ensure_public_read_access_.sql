-- Enable RLS on the alerts table (if not already enabled)
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Admins can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Admins can delete alerts" ON public.alerts;
DROP POLICY IF EXISTS "Public can read alerts" ON public.alerts;
DROP POLICY IF EXISTS "consolidating_rls_policies_for_public_alerts_table_select_" ON public.alerts;

-- Create a policy to allow public read access for alerts
CREATE POLICY "Public read access for alerts" ON public.alerts
FOR SELECT USING (true);

-- Create policies to allow only administrators to insert, update, and delete alerts
CREATE POLICY "Admins can insert alerts" ON public.alerts
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can update alerts" ON public.alerts
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete alerts" ON public.alerts
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));