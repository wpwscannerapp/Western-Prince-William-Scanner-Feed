INSERT INTO public.profiles (id, subscription_status, role)
VALUES ('8a87e3e8-640b-4d72-aff7-d120051dac9f', 'free', 'user')
ON CONFLICT (id) DO NOTHING;