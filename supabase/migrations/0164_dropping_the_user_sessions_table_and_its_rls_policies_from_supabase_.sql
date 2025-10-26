-- Drop RLS policies for user_sessions table
DROP POLICY IF EXISTS users_can_update_their_own_sessions ON public.user_sessions;
DROP POLICY IF EXISTS users_can_create_their_own_sessions ON public.user_sessions;
DROP POLICY IF EXISTS users_can_view_their_own_sessions ON public.user_sessions;
DROP POLICY IF EXISTS users_can_delete_their_own_sessions ON public.user_sessions;

-- Drop the user_sessions table
DROP TABLE IF EXISTS public.user_sessions;