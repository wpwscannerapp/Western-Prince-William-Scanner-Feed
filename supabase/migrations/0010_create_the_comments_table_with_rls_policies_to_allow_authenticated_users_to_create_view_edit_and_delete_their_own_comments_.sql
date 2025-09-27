-- Create the 'comments' table
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for the 'comments' table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can create their own comments
CREATE POLICY "Users can create their own comments" ON public.comments
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: Anyone can view comments
CREATE POLICY "Anyone can view comments" ON public.comments
FOR SELECT USING (true);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments" ON public.comments
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON public.comments
FOR DELETE TO authenticated USING (auth.uid() = user_id);