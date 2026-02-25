-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-anexos',
  'chat-anexos',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/xml', 'application/xml']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
CREATE POLICY "Chat participants can view attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-anexos');

CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-anexos');

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-anexos' AND owner = auth.uid());

-- Add attachment columns to mensagens table
ALTER TABLE public.mensagens 
ADD COLUMN IF NOT EXISTS anexo_url TEXT,
ADD COLUMN IF NOT EXISTS anexo_nome TEXT,
ADD COLUMN IF NOT EXISTS anexo_tipo TEXT,
ADD COLUMN IF NOT EXISTS anexo_tamanho INTEGER;