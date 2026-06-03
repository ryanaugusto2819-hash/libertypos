
DROP POLICY IF EXISTS "Service role can insert logs" ON public.webhook_logs;
CREATE POLICY "Service role can insert logs"
ON public.webhook_logs FOR INSERT TO service_role
WITH CHECK (true);
