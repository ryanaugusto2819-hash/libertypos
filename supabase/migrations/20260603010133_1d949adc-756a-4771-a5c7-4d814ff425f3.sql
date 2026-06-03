
-- 1. Fix privilege escalation: restrict user_roles modifications to admins only
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Lock down order-attachments: remove public listing & restrict DELETE to admins
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete order attachments" ON storage.objects;

-- Public bucket files remain accessible via getPublicUrl/CDN without a SELECT policy,
-- but listing via the storage API is now blocked.
CREATE POLICY "Admins can delete order attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'order-attachments' AND has_role(auth.uid(), 'admin'::app_role));

-- 3. Remove pedidos from realtime publication (not used by the app and exposed sensitive data)
ALTER PUBLICATION supabase_realtime DROP TABLE public.pedidos;

-- 4. Revoke EXECUTE on SECURITY DEFINER functions from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
