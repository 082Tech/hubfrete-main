
-- =============================================
-- ENTREGAS: adicionar colunas do dev
-- =============================================
ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS carrocerias_alocadas JSONB;

-- =============================================
-- NFES: adicionar colunas fiscais do dev
-- =============================================
ALTER TABLE public.nfes
  ADD COLUMN IF NOT EXISTS erro_validacao TEXT,
  ADD COLUMN IF NOT EXISTS xml_path TEXT,
  ADD COLUMN IF NOT EXISTS ftp_path TEXT,
  ADD COLUMN IF NOT EXISTS remetente_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS remetente_razao_social TEXT,
  ADD COLUMN IF NOT EXISTS remetente_inscricao_estadual TEXT,
  ADD COLUMN IF NOT EXISTS destinatario_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS destinatario_razao_social TEXT,
  ADD COLUMN IF NOT EXISTS destinatario_inscricao_estadual TEXT,
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC,
  ADD COLUMN IF NOT EXISTS peso_bruto NUMERIC,
  ADD COLUMN IF NOT EXISTS serie TEXT,
  ADD COLUMN IF NOT EXISTS modelo TEXT,
  ADD COLUMN IF NOT EXISTS numero_nfe TEXT;

-- =============================================
-- CTES: adicionar colunas do dev
-- =============================================
ALTER TABLE public.ctes
  ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES public.empresas(id),
  ADD COLUMN IF NOT EXISTS serie TEXT;

-- =============================================
-- MDFES: adicionar colunas do dev
-- =============================================
ALTER TABLE public.mdfes
  ADD COLUMN IF NOT EXISTS serie TEXT,
  ADD COLUMN IF NOT EXISTS protocolo TEXT,
  ADD COLUMN IF NOT EXISTS xml_content TEXT,
  ADD COLUMN IF NOT EXISTS ftp_xml_path TEXT,
  ADD COLUMN IF NOT EXISTS ftp_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS autorizado_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancelado_at TIMESTAMP WITH TIME ZONE;
