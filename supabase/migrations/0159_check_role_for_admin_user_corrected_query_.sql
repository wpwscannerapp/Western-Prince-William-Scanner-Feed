SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'first_name' as first_name,
  au.raw_user_meta_data->>'last_name' as last_name,
  p.role,
  p.subscription_status
FROM
  auth.users AS au
LEFT JOIN
  public.profiles AS p ON au.id = p.id
WHERE
  au.email = 'wpwscannerfeed@gmail.com';