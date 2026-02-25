-- Adicionar coluna expira_em faltante na tabela cargas
ALTER TABLE public.cargas
ADD COLUMN IF NOT EXISTS expira_em TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.cargas.expira_em IS 'Data de expiração da publicação da carga';