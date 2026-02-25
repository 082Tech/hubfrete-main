-- Remove redundant carga_id column from enderecos_carga
-- Since cargas now has endereco_origem_id and endereco_destino_id, the inverse relationship is no longer needed

ALTER TABLE public.enderecos_carga DROP COLUMN IF EXISTS carga_id;