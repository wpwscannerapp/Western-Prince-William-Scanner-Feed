SELECT
    tgname AS trigger_name,
    relname AS table_name,
    pg_get_triggerdef(t.oid) AS trigger_definition,
    tgenabled AS is_enabled
FROM
    pg_trigger t
JOIN
    pg_class c ON t.tgrelid = c.oid
WHERE
    relname = 'alerts' AND tgname = 'on_alert_created';