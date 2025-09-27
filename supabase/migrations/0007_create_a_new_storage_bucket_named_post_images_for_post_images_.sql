INSERT INTO storage.buckets (id, name, public)
VALUES ('post_images', 'post_images', TRUE)
ON CONFLICT (id) DO NOTHING;