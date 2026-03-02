
-- Create storage bucket for order attachments (public so URLs work without auth)
INSERT INTO storage.buckets (id, name, public) VALUES ('order-attachments', 'order-attachments', true);

-- Allow anyone to upload to the bucket (no auth required for this app)
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-attachments');
CREATE POLICY "Allow public read" ON storage.objects FOR SELECT USING (bucket_id = 'order-attachments');
CREATE POLICY "Allow public delete" ON storage.objects FOR DELETE USING (bucket_id = 'order-attachments');
