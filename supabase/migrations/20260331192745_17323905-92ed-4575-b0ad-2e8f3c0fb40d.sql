-- 2.1 Colunas de áudio
ALTER TABLE public.mensagens 
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duracao integer,
  ADD COLUMN IF NOT EXISTS audio_transcricao text;

-- 2.2 Bucket de Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-audios', 'chat-audios', true, 10485760, ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

-- 2.3 Políticas de Storage
CREATE POLICY "Authenticated users can upload audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-audios');

CREATE POLICY "Anyone can view chat audios" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-audios');