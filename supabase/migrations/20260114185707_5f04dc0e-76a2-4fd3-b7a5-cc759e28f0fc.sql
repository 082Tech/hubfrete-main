-- Adicionar valor do frete por tonelada na tabela cargas
ALTER TABLE public.cargas 
ADD COLUMN IF NOT EXISTS valor_frete_tonelada numeric DEFAULT NULL;

-- Remover campo quantidade que não é mais necessário
-- (não vamos dropar, apenas deixar de usar para evitar breaking changes)
COMMENT ON COLUMN public.cargas.quantidade IS 'DEPRECATED: campo não utilizado mais';