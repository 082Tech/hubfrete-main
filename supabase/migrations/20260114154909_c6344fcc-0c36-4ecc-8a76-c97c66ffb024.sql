-- Add new columns for cargo creation enhancements
-- Necessidades especiais (cinta, lona, etc.)
ALTER TABLE public.cargas 
ADD COLUMN IF NOT EXISTS necessidades_especiais text[] DEFAULT '{}';

-- Regras de carregamento de mercadoria
ALTER TABLE public.cargas 
ADD COLUMN IF NOT EXISTS regras_carregamento text;

-- Nota fiscal URL (stored in Supabase Storage)
ALTER TABLE public.cargas 
ADD COLUMN IF NOT EXISTS nota_fiscal_url text;

-- Create table for saved destination contacts
CREATE TABLE IF NOT EXISTS public.contatos_destino (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id bigint NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cnpj text NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  latitude numeric,
  longitude numeric,
  contato_nome text,
  contato_telefone text,
  contato_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(empresa_id, cnpj)
);

-- Enable RLS
ALTER TABLE public.contatos_destino ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for contatos_destino
CREATE POLICY "Allow all for authenticated" ON public.contatos_destino
  FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for nota fiscal files
INSERT INTO storage.buckets (id, name, public)
VALUES ('notas-fiscais', 'notas-fiscais', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for nota fiscal
CREATE POLICY "Users can upload notas fiscais" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'notas-fiscais' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view notas fiscais" ON storage.objects
FOR SELECT USING (
  bucket_id = 'notas-fiscais' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update notas fiscais" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'notas-fiscais' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete notas fiscais" ON storage.objects
FOR DELETE USING (
  bucket_id = 'notas-fiscais' 
  AND auth.role() = 'authenticated'
);