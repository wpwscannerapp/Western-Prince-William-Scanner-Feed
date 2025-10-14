-- Create incidents table
CREATE TABLE public.incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || description || ' ' || location || ' ' || type)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Create GIN index for efficient full-text search
CREATE INDEX search_vector_idx ON public.incidents USING GIN(search_vector);

-- Policies for authenticated users to read incidents
CREATE POLICY "Authenticated users can view incidents" ON public.incidents
FOR SELECT TO authenticated USING (true);

-- Policy for admins to insert incidents (assuming admin_id will be added later if needed)
-- For now, we'll allow authenticated users to insert, but this can be restricted to admins.
CREATE POLICY "Authenticated users can insert incidents" ON public.incidents
FOR INSERT TO authenticated WITH CHECK (true);

-- Policy for admins to update incidents
CREATE POLICY "Admins can update incidents" ON public.incidents
FOR UPDATE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'))));

-- Policy for admins to delete incidents
CREATE POLICY "Admins can delete incidents" ON public.incidents
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'))));