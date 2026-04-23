-- Permitir upload temporário no bucket logos para qualquer um (será revertido depois)
DROP POLICY IF EXISTS "temp_logos_upload_anon" ON storage.objects;
CREATE POLICY "temp_logos_upload_anon" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "temp_logos_update_anon" ON storage.objects;
CREATE POLICY "temp_logos_update_anon" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'logos');

-- Garante bucket público para leitura
UPDATE storage.buckets SET public = true WHERE id = 'logos';