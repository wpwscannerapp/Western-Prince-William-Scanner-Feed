INSERT INTO public.profiles (id, first_name, last_name, subscription_status, role)
VALUES (
  '8a87e3e8-640b-4d72-aff7-d120051dac9f', -- REPLACE WITH THE ACTUAL USER ID FROM YOUR CONSOLE LOGS
  'Test',
  'User',
  'free',
  'user'
)
ON CONFLICT (id) DO NOTHING;