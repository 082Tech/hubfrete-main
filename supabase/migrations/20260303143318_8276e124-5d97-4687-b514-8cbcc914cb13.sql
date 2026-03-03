-- MIGRAR DADOS: veiculos.motorista_id → motorista_padrao_id
UPDATE public.veiculos 
SET motorista_padrao_id = motorista_id 
WHERE motorista_id IS NOT NULL AND motorista_padrao_id IS NULL;

-- SEÇÃO 2: Remoção de colunas (vínculos permanentes eliminados)
ALTER TABLE public.veiculos DROP COLUMN IF EXISTS motorista_id;
ALTER TABLE public.veiculos DROP COLUMN IF EXISTS carroceria_id;
ALTER TABLE public.carrocerias DROP COLUMN IF EXISTS motorista_id;

-- SEÇÃO 4: Drop overloads antigos
DROP FUNCTION IF EXISTS public.accept_carga_tx(uuid, uuid, uuid, uuid, numeric, numeric, uuid, text);
DROP FUNCTION IF EXISTS public.accept_carga_tx(uuid, uuid, uuid, uuid, integer, numeric, uuid, text, timestamptz, jsonb);
DROP FUNCTION IF EXISTS public.accept_carga_tx(uuid, uuid, uuid, uuid, numeric, numeric, uuid, text, timestamptz, jsonb);