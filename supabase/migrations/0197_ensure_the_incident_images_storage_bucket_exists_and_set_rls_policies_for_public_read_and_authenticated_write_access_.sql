-- 1. Create the bucket if it doesn't exist (Supabase CLI handles this, but good practice)
-- SELECT storage.create_bucket('incident_images', 'public');

-- 2. Enable RLS on the bucket (it should be enabled by default, but ensure)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; -- This is usually done at the schema level

-- 3. Allow public read access (for displaying images in the feed)
CREATE POLICY "Allow public read access to incident images"
ON storage.objects FOR SELECT
USING (bucket_id = 'incident_images');

-- 4. Allow authenticated users (admins) to insert images
CREATE POLICY "Allow authenticated insert for incident images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'incident_images');

-- 5. Allow authenticated users (admins) to delete their own images (or any image in the bucket for simplicity here, assuming only admins upload)
CREATE POLICY "Allow authenticated delete for incident images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'incident_images');