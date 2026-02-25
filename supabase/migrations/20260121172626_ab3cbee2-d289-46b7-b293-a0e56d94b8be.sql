-- Add RLS policy to allow authenticated users to read files from notas-fiscais bucket
-- This is needed because the bucket is private and we use signed URLs

CREATE POLICY "Allow authenticated users to read notas-fiscais"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'notas-fiscais');

-- Allow authenticated users to upload/update their own files
CREATE POLICY "Allow authenticated users to upload to notas-fiscais"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'notas-fiscais');

CREATE POLICY "Allow authenticated users to update notas-fiscais"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'notas-fiscais');

CREATE POLICY "Allow authenticated users to delete from notas-fiscais"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'notas-fiscais');