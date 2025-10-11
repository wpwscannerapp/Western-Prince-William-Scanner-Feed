-- Drop existing contact_settings table if it exists
DROP TABLE IF EXISTS public.contact_settings CASCADE;

-- Create contact_settings table with contact_cards column
CREATE TABLE public.contact_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_cards JSONB DEFAULT '[]'::jsonb NOT NULL, -- Stores an array of contact card objects
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

-- Policy for admin delete access
CREATE POLICY "Admins can delete contact settings" ON public.contact_settings
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));