DROP POLICY IF EXISTS "Allow anon read all pedidos" ON public.pedidos;

CREATE POLICY "Users can view own pedidos"
ON public.pedidos
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all pedidos"
ON public.pedidos
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));