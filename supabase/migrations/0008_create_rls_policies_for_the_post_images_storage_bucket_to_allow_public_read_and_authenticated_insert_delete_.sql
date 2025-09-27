-- Allow authenticated users to insert files into the 'post_images' bucket
CREATE POLICY "Allow authenticated upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post_images');

-- Allow public read access to files in the 'post_images' bucket
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT
USING (bucket_id = 'post_images');

-- Allow authenticated users to delete files from the 'post_images' bucket
CREATE POLICY "Allow authenticated delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'post_images');