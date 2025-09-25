-- Create the posts table
CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  text TEXT NOT NULL,
  image_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL -- Link to auth.users, set to NULL if admin user is deleted
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read posts
CREATE POLICY "Authenticated users can view posts" ON public.posts
FOR SELECT TO authenticated USING (true);

-- Policy for admins to insert posts
CREATE POLICY "Admins can insert posts" ON public.posts
FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE auth.email() = 'admin@example.com'));

-- Policy for admins to update posts
CREATE POLICY "Admins can update posts" ON public.posts
FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT id FROM public.profiles WHERE auth.email() = 'admin@example.com'));

-- Policy for admins to delete posts
CREATE POLICY "Admins can delete posts" ON public.posts
FOR DELETE TO authenticated USING (auth.uid() IN (SELECT id FROM public.profiles WHERE auth.email() = 'admin@example.com'));

-- Seed sample posts (if the table was just created, these will be new)
INSERT INTO public.posts (text, image_url, timestamp)
VALUES
('Police activity at Main St & Rt. 234—avoid area due to ongoing incident. Expect delays.', NULL, '2025-09-13 22:27:00+00'),
('Structure fire reported at 123 Elm Street. Fire and EMS units en route. Please clear the roads.', 'https://example.com/fire_image.jpg', '2025-09-13 22:35:00+00'),
('Medical emergency on I-66 Eastbound near Exit 43. Expect lane closures and heavy traffic. Use alternate routes.', NULL, '2025-09-13 22:45:00+00')
ON CONFLICT (id) DO NOTHING; -- Prevents errors if posts already exist (e.g., if you ran this before)