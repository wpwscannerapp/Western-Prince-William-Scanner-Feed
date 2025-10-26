-- Add admin_id to the incidents table
ALTER TABLE public.incidents
ADD COLUMN admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS for incidents table if not already
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Policy for admins to insert incidents (now including admin_id)
DROP POLICY IF EXISTS "Admins can insert incidents" ON public.incidents;
CREATE POLICY "Admins can insert incidents" ON public.incidents
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policy for admins to update incidents
DROP POLICY IF EXISTS "Admins can update incidents" ON public.incidents;
CREATE POLICY "Admins can update incidents" ON public.incidents
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policy for admins to delete incidents
DROP POLICY IF EXISTS "Admins can delete incidents" ON public.incidents;
CREATE POLICY "Admins can delete incidents" ON public.incidents
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Policy for public read access for incidents
DROP POLICY IF EXISTS "Authenticated users can view incidents" ON public.incidents;
CREATE POLICY "Public can read incidents" ON public.incidents
FOR SELECT
USING (true);

-- Drop existing tables that reference 'posts'
DROP TRIGGER IF EXISTS on_new_alert_send_notification ON public.alerts; -- Drop trigger if it references posts
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;

-- Recreate likes table to reference 'incidents'
CREATE TABLE public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (incident_id, user_id) -- Ensure a user can only like an incident once
);

-- Enable RLS for likes table
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Policies for likes table
CREATE POLICY "Users can like their own incidents" ON public.likes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own incidents" ON public.likes
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view likes" ON public.likes
FOR SELECT TO authenticated
USING (true);

-- Recreate comments table to reference 'incidents'
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policies for comments table
CREATE POLICY "Users can create their own comments" ON public.comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view comments" ON public.comments
FOR SELECT TO authenticated
USING (true);

-- Enable Realtime for the new likes and comments tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Enable Realtime for the incidents table if not already
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;