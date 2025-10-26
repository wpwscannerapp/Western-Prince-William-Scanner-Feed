-- Create feedback_and_suggestions table
CREATE TABLE public.feedback_and_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: Link to user if logged in
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.feedback_and_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert feedback
CREATE POLICY "Authenticated users can insert feedback" ON public.feedback_and_suggestions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: Anonymous users can insert feedback (user_id will be NULL)
CREATE POLICY "Anonymous users can insert feedback" ON public.feedback_and_suggestions
FOR INSERT WITH CHECK (auth.uid() IS NULL);

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON public.feedback_and_suggestions
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback" ON public.feedback_and_suggestions
FOR SELECT TO authenticated USING (auth.uid() = user_id);