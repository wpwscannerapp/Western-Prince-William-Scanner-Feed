-- Replace '8a87e3e8-640b-4d72-aff7-d120051dac9f' with the user ID from your console logs (the one that starts with 'AuthContext: User ID for session creation:')
SET ROLE authenticated;
SELECT * FROM public.profiles WHERE id = '8a87e3e8-640b-4d72-aff7-d120051dac9f';
RESET ROLE;