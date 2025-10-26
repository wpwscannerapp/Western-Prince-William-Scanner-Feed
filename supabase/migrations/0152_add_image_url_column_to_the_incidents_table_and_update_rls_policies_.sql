-- Add image_url column to the incidents table
ALTER TABLE public.incidents
ADD COLUMN image_url TEXT;

-- Update RLS policy for incidents table to allow image_url to be updated by admins
-- (The existing "Admins can update incidents" policy already covers this, but we'll ensure it's explicit)
DROP POLICY IF EXISTS "Admins can update incidents" ON public.incidents;
CREATE POLICY "Admins can update incidents" ON public.incidents
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));