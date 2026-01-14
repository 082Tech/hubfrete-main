-- Remove redundant columns from entregas table
-- empresa_id can be derived from carga_id -> cargas.empresa_id
-- Location tracking is handled by localizações table

ALTER TABLE public.entregas 
  DROP COLUMN IF EXISTS empresa_id,
  DROP COLUMN IF EXISTS latitude_atual,
  DROP COLUMN IF EXISTS longitude_atual,
  DROP COLUMN IF EXISTS ultima_atualizacao_localizacao;