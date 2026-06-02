-- Remove políticas públicas inseguras do bucket order-attachments
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;

-- Cria políticas restritas a usuários autenticados para upload e delete
CREATE POLICY "Authenticated upload order attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-attachments');

CREATE POLICY "Authenticated delete order attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'order-attachments');