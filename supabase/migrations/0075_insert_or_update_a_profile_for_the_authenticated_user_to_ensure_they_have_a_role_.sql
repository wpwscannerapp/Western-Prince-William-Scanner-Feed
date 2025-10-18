INSERT INTO public.profiles (id, first_name, last_name, role, subscription_status)
VALUES ('8a87e3e8-640b-4d72-aff7-d120051dac9f', 'WPW', 'Scanner', 'admin', 'active')
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  subscription_status = EXCLUDED.subscription_status,
  updated_at = NOW();