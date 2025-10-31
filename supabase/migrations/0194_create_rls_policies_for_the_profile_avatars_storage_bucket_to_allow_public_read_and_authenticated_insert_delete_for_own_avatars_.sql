-- Policy for public read access to profile_avatars
CREATE POLICY "Public read access for profile avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_avatars');

-- Policy for authenticated users to insert their own avatars
CREATE POLICY "Authenticated users can insert their own profile avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile_avatars' AND auth.uid() = owner);

-- Policy for authenticated users to update their own avatars
CREATE POLICY "Authenticated users can update their own profile avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile_avatars' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'profile_avatars' AND auth.uid() = owner);

-- Policy for authenticated users to delete their own avatars
CREATE POLICY "Authenticated users can delete their own profile avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile_avatars' AND auth.uid() = owner);