-- Drop the existing RLS policy for inserting user sessions if it exists
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.user_sessions;

-- Recreate the RLS policy to allow authenticated users to insert their own session data
CREATE POLICY "Users can create their own sessions" ON public.user_sessions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);