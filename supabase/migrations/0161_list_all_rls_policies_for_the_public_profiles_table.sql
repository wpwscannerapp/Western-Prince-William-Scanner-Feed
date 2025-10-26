SELECT
  policyname AS name,
  tablename AS table,
  permissive,
  cmd AS command,
  qual AS definition,
  with_check AS check
FROM
  pg_policies
WHERE
  tablename = 'profiles' AND schemaname = 'public';