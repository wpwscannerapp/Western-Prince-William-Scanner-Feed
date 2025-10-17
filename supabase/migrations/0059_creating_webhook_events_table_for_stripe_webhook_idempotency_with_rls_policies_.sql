-- Create webhook_events table
CREATE TABLE public.webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to insert (only the webhook function should write)
CREATE POLICY "Service role can insert webhook events" ON public.webhook_events
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy: Allow service role to select (for checking idempotency)
CREATE POLICY "Service role can select webhook events" ON public.webhook_events
FOR SELECT USING (auth.role() = 'service_role');

-- No public read/update/delete policies for security