INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_avatars', 'profile_avatars', TRUE)
ON CONFLICT (id) DO NOTHING;