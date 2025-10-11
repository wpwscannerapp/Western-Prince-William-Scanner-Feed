ALTER TABLE public.user_sessions
ADD CONSTRAINT unique_session_id UNIQUE (session_id);