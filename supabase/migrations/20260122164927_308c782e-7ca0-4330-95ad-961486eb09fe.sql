-- Revert notas-fiscais to private (for security)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'notas-fiscais';

-- Create a new public bucket for fleet photos (vehicles and carrocerias)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-frota', 'fotos-frota', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS policies for fotos-frota bucket
CREATE POLICY "Authenticated users can upload fleet photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fotos-frota');

CREATE POLICY "Authenticated users can update their fleet photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'fotos-frota');

CREATE POLICY "Authenticated users can delete their fleet photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fotos-frota');

CREATE POLICY "Anyone can view fleet photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'fotos-frota');