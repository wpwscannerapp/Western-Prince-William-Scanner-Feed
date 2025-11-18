INSERT INTO public.push_subscriptions (user_id, subscription)
VALUES (
  '8a87e3e8-640b-4d72-aff7-d120051dac9f',
  '{
    "endpoint": "https://example.com/push/endpoint/123",
    "expirationTime": null,
    "keys": {
      "p256dh": "someP256dhKey",
      "auth": "someAuthKey"
    }
  }'
)
ON CONFLICT (user_id, endpoint) DO UPDATE SET
  subscription = EXCLUDED.subscription,
  created_at = NOW();