-- Migration: Criar tabela mdfes (Manifestos Eletrônicos de Documentos Fiscais)
-- Data: 2026-02-13
-- Descrição: Tabela para armazenar MDF-es emitidos para viagens

CREATE TABLE IF NOT EXISTS public.mdfes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID REFERENCES public.viagens(id) ON DELETE CASCADE,
  empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE SET NULL,
  focus_ref TEXT UNIQUE NOT NULL,
  chave_acesso TEXT,
  numero TEXT,
  serie TEXT,
  status TEXT DEFAULT 'processando',
  protocolo TEXT,
  xml_content TEXT,
  xml_path TEXT,
  pdf_path TEXT,
  ftp_xml_path TEXT,
  ftp_pdf_path TEXT,
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  authorized_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  encerrado_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mdfes_viagem ON public.mdfes(viagem_id);
CREATE INDEX IF NOT EXISTS idx_mdfes_empresa ON public.mdfes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mdfes_status ON public.mdfes(status);
CREATE INDEX IF NOT EXISTS idx_mdfes_chave ON public.mdfes(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_mdfes_created ON public.mdfes(created_at DESC);

-- Comentários explicativos
COMMENT ON TABLE public.mdfes 
  IS 'Manifestos Eletrônicos de Documentos Fiscais - documentos obrigatórios para transporte de cargas';

COMMENT ON COLUMN public.mdfes.viagem_id 
  IS 'Referência à viagem que este MDF-e documenta';

COMMENT ON COLUMN public.mdfes.empresa_id 
  IS 'Empresa emitente do MDF-e (transportadora)';

COMMENT ON COLUMN public.mdfes.focus_ref 
  IS 'Referência única para rastreamento na API FocusNFe';

COMMENT ON COLUMN public.mdfes.chave_acesso 
  IS 'Chave de acesso de 44 dígitos do MDF-e autorizado';

COMMENT ON COLUMN public.mdfes.status 
  IS 'Status do MDF-e: processando, autorizado, rejeitado, cancelado, encerrado';

COMMENT ON COLUMN public.mdfes.protocolo 
  IS 'Número do protocolo de autorização da SEFAZ';

COMMENT ON COLUMN public.mdfes.xml_content 
  IS 'Conteúdo completo do XML do MDF-e autorizado';

COMMENT ON COLUMN public.mdfes.xml_path 
  IS 'Caminho do XML no Supabase Storage';

COMMENT ON COLUMN public.mdfes.pdf_path 
  IS 'Caminho do DAMDFE (PDF) no Supabase Storage';

COMMENT ON COLUMN public.mdfes.encerrado_at 
  IS 'Timestamp de quando o MDF-e foi encerrado (fim da viagem)';

-- Enable Row Level Security (RLS)
ALTER TABLE public.mdfes ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver MDF-es de suas próprias empresas ou viagens
CREATE POLICY "Users can view mdfes"
  ON public.mdfes
  FOR SELECT
  USING (
    empresa_id IN (SELECT empresa_id FROM public.motoristas WHERE user_id = auth.uid())
    OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
    OR EXISTS (
      SELECT 1 FROM public.viagens v WHERE v.id = viagem_id AND (
        v.motorista_id = public.get_user_motorista_id(auth.uid())
        OR public.user_belongs_to_empresa(auth.uid(), (SELECT empresa_id FROM public.motoristas WHERE id = v.motorista_id))
      )
    )
    OR public.is_admin(auth.uid())
  );

-- Policy: Usuários podem inserir MDF-es para suas próprias empresas
CREATE POLICY "Users can insert mdfes"
  ON public.mdfes
  FOR INSERT
  WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM public.motoristas WHERE user_id = auth.uid())
    OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
    OR EXISTS (
      SELECT 1 FROM public.viagens v WHERE v.id = viagem_id AND (
        v.motorista_id = public.get_user_motorista_id(auth.uid())
        OR public.user_belongs_to_empresa(auth.uid(), (SELECT empresa_id FROM public.motoristas WHERE id = v.motorista_id))
      )
    )
    OR public.is_admin(auth.uid())
  );

-- Policy: Usuários podem atualizar MDF-es de suas próprias empresas
CREATE POLICY "Users can update mdfes"
  ON public.mdfes
  FOR UPDATE
  USING (
    empresa_id IN (SELECT empresa_id FROM public.motoristas WHERE user_id = auth.uid())
    OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
    OR EXISTS (
      SELECT 1 FROM public.viagens v WHERE v.id = viagem_id AND (
        v.motorista_id = public.get_user_motorista_id(auth.uid())
        OR public.user_belongs_to_empresa(auth.uid(), (SELECT empresa_id FROM public.motoristas WHERE id = v.motorista_id))
      )
    )
    OR public.is_admin(auth.uid())
  );

-- Policy: Service role pode fazer tudo
CREATE POLICY "Service role can do everything on mdfes"
  ON public.mdfes
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
