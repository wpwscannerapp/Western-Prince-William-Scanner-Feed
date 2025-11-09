-- Allow public read access
CREATE POLICY "Public read access for comment media" ON storage.objects FOR SELECT USING (bucket_id = 'comment_media');

-- Allow authenticated users to insert their own files
CREATE POLICY "Authenticated users can insert comment media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comment_media' AND auth.uid() = owner);

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete comment media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'comment_media' AND auth.uid() = owner);