-- Add manifesto_url to viagens table for MDF-e documents
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS manifesto_url TEXT;

-- Add comment explaining the purpose
COMMENT ON COLUMN viagens.manifesto_url IS 'URL do Manifesto Eletrônico de Documentos Fiscais (MDF-e) da viagem';