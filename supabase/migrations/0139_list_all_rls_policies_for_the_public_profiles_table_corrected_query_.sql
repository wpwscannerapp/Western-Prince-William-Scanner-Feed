SELECT
    p.polname AS policy_name,
    p.polpermissive AS permissive,
    CASE p.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
        ELSE 'UNKNOWN'
    END AS command,
    pg_get_expr(p.polqual, p.polrelid) AS definition,
    pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
FROM
    pg_policy p
JOIN
    pg_class c ON p.polrelid = c.oid
JOIN
    pg_namespace n ON c.relnamespace = n.oid
WHERE
    n.nspname = 'public' AND c.relname = 'profiles';