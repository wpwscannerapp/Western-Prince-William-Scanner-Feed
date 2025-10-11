-- Create contact_settings table
CREATE TABLE public.contact_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_numbers JSONB DEFAULT '[]'::jsonb NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;

-- Policy for public read access
CREATE POLICY "Public read access for contact settings" ON public.contact_settings
FOR SELECT USING (true);

-- Policy for admin insert access
CREATE POLICY "Admins can insert contact settings" ON public.contact_settings
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));

-- Policy for admin update access
CREATE POLICY "Admins can update contact settings" ON public.contact_settings
FOR UPDATE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));

-- Policy for admin delete access (optional, but good practice for completeness)
CREATE POLICY "Admins can delete contact settings" ON public.contact_settings
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));