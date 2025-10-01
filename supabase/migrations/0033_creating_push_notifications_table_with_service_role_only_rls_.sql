-- Create push_notifications table
CREATE TABLE public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription JSONB NOT NULL, -- This will store the actual push subscription object
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT, -- Added URL field
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE -- To track when it was actually sent by a worker
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for service_role only to manage push_notifications
CREATE POLICY "Service role can manage push_notifications" ON public.push_notifications
FOR ALL TO service_role USING (true) WITH CHECK (true);