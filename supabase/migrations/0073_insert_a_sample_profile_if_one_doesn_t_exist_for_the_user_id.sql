INSERT INTO public.profiles (id, first_name, last_name, role, subscription_status)
VALUES ('8a87e3e8-640b-4d72-aff7-d120051dac9f', 'WPW', 'Scanner', 'admin', 'active')
ON CONFLICT (id) DO NOTHING;