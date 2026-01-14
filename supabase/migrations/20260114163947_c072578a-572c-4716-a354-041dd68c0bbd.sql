-- Add nome and cnpj_matriz to empresas table
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS nome text,
ADD COLUMN IF NOT EXISTS cnpj_matriz text;

-- Add comment for clarity
COMMENT ON COLUMN public.empresas.nome IS 'Nome fantasia ou razão social da empresa';
COMMENT ON COLUMN public.empresas.cnpj_matriz IS 'CNPJ da matriz da empresa';