-- Create user_sessions table to track active user sessions
CREATE TABLE public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE, -- Unique identifier for the session (from localStorage)
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Policy: Users can create their own sessions
CREATE POLICY "Users can create their own sessions" ON public.user_sessions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions (e.g., extend expiration)
CREATE POLICY "Users can update their own sessions" ON public.user_sessions
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete their own sessions" ON public.user_sessions
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policy: Service role can manage all sessions (for background cleanup/admin tasks)
CREATE POLICY "Service role can manage all sessions" ON public.user_sessions
FOR ALL TO service_role USING (true) WITH CHECK (true);