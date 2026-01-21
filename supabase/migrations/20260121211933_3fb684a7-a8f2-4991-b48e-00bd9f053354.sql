-- Adicionar campo peso_minimo_fracionado_kg na tabela cargas
-- Este campo define o peso mínimo que cada entrega deve ter quando a carga permite fracionamento
ALTER TABLE public.cargas
ADD COLUMN peso_minimo_fracionado_kg numeric NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.cargas.peso_minimo_fracionado_kg IS 'Peso mínimo por entrega quando permite_fracionado = true. Se null ou 0, usa o peso total da carga.';