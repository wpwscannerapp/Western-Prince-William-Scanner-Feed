-- Replace 'YOUR_ACCESS_TOKEN_HERE' with the actual access token from your browser's local storage.
-- This query needs to be run in the Supabase SQL Editor with the JWT token set in the header.
-- In the Supabase SQL Editor, you can usually set the JWT token in a dropdown or input field.
SELECT * FROM public.profiles WHERE id = auth.uid();