-- Optimize 'Service role can insert webhook events' policy
DROP POLICY IF EXISTS "Service role can insert webhook events" ON public.webhook_events;
CREATE POLICY "Service role can insert webhook events" ON public.webhook_events
FOR INSERT TO service_role WITH CHECK (((select auth.role()) = 'service_role'::text));

-- Optimize 'Service role can select webhook events' policy
DROP POLICY IF EXISTS "Service role can select webhook events" ON public.webhook_events;
CREATE POLICY "Service role can select webhook events" ON public.webhook_events
FOR SELECT TO service_role USING (((select auth.role()) = 'service_role'::text));