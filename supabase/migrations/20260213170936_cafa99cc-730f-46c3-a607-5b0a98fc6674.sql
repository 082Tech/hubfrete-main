
-- Migration 3: IBGE code on enderecos_carga + IE on cargas
ALTER TABLE public.enderecos_carga
  ADD COLUMN IF NOT EXISTS codigo_municipio_ibge TEXT;

ALTER TABLE public.cargas
  ADD COLUMN IF NOT EXISTS destinatario_inscricao_estadual TEXT,
  ADD COLUMN IF NOT EXISTS remetente_inscricao_estadual TEXT;
