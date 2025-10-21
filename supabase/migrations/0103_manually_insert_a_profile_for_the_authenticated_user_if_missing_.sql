INSERT INTO public.profiles (id, first_name, last_name, subscription_status, role)
    VALUES (
      '8a87e3e8-640b-4d72-aff7-d120051dac9f', -- Replace with the actual user ID from your logs
      'Test',
      'User',
      'free',
      'user'
    )
    ON CONFLICT (id) DO NOTHING;