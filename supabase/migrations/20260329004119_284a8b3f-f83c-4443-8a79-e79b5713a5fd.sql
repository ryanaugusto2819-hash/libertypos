CREATE POLICY "Public can view all pedidos"
  ON public.pedidos
  FOR SELECT
  TO public
  USING (true);