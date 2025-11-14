CREATE POLICY "Admins can delete feedback and suggestions" ON public.feedback_and_suggestions
FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);