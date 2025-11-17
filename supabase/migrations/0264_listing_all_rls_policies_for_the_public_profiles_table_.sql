SELECT
    policyname AS policy_name,
    tablename AS table_name,
    permissive,
    cmd AS command,
    qual AS using_clause,
    with_check AS with_check_clause
FROM
    pg_policies
WHERE
    tablename = 'profiles' AND schemaname = 'public';