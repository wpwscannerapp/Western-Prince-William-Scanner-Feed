-- Create the user_sessions table
CREATE TABLE public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE, -- Unique identifier for each client session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable Row Level Security (RLS) for the user_sessions table
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view their own sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Policy: Authenticated users can create their own sessions
CREATE POLICY "Users can create their own sessions" ON public.user_sessions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can delete their own sessions
CREATE POLICY "Users can delete their own sessions" ON public.user_sessions
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policy: Authenticated users can update their own sessions (e.g., extend expiry)
CREATE POLICY "Users can update their own sessions" ON public.user_sessions
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Optional: Policy for service role to manage all sessions (e.g., for cleanup or admin actions)
-- This policy is not strictly necessary for client-side enforcement but good for backend tasks.
-- CREATE POLICY "Service role can manage all sessions" ON public.user_sessions
-- FOR ALL USING (true) WITH CHECK (true);