-- Create the 'likes' table
CREATE TABLE public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (post_id, user_id) -- Ensure a user can only like a post once
);

-- Enable RLS for the 'likes' table
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert their own likes
CREATE POLICY "Users can like their own posts" ON public.likes
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can delete their own likes
CREATE POLICY "Users can unlike their own posts" ON public.likes
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policy: Anyone can view likes (for displaying total likes)
CREATE POLICY "Anyone can view likes" ON public.likes
FOR SELECT USING (true);