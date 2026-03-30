DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'pedidos' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.pedidos', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow anon read all pedidos" ON public.pedidos
AS PERMISSIVE FOR SELECT TO anon, authenticated
USING (true);