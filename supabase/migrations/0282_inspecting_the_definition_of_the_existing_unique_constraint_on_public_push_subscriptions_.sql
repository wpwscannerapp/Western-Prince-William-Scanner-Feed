SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.push_subscriptions'::regclass
  AND conname = 'push_subscriptions_user_endpoint_key';