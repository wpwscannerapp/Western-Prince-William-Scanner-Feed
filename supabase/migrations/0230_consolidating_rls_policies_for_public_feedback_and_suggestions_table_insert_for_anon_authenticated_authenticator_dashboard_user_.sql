-- Drop specific anonymous insert policy, as 'Allow public feedback submission' is broader
DROP POLICY IF EXISTS "Anonymous users can insert feedback with contact info" ON public.feedback_and_suggestions;

-- Drop specific authenticated insert policy, as 'Allow public feedback submission' is broader
DROP POLICY IF EXISTS "Users can insert their own feedback with contact info" ON public.feedback_and_suggestions;

-- The 'Allow public feedback submission' policy (WITH CHECK (true)) already covers all INSERTs for all roles.
-- No further action needed for INSERT policies for anon, authenticated, authenticator, dashboard_user roles,
-- as the single 'Allow public feedback submission' policy is sufficient and optimal.