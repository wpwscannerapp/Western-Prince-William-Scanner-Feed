CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, subscription_status, role)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    'free', -- Default to free on signup
    'user' -- Default role for new users
  )
  ON CONFLICT (id) DO NOTHING; -- Ensure it doesn't fail if a profile somehow already exists
  RETURN new;
END;
$$;