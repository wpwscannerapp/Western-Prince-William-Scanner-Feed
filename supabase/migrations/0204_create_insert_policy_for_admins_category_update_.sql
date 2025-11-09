CREATE POLICY "Admins can create incident updates" ON public.comments 
FOR INSERT TO authenticated WITH CHECK (
  category = 'update' AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);