DROP POLICY IF EXISTS "Allow public read pedidos" ON public.pedidos;
CREATE POLICY "Allow public read pedidos" ON public.pedidos FOR SELECT USING (true);