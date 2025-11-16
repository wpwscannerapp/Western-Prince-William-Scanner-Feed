SELECT
    table_name,
    relrowsecurity AS rls_enabled
FROM
    information_schema.tables
JOIN
    pg_class ON pg_class.relname = information_schema.tables.table_name
WHERE
    table_schema = 'public' AND table_name = 'feedback_and_suggestions';