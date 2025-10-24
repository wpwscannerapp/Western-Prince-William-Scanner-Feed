SELECT
  policyname AS name,
  tablename AS table,
  permissive,
  cmd AS command,
  qual AS definition
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public';