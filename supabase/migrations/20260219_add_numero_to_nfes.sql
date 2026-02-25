-- Migration: Adicionar coluna 'numero' na tabela nfes
-- Data: 2026-02-19
-- Descrição: Garante que a coluna 'numero' exista na tabela 'nfes' para armazenar o número da Nota Fiscal.

ALTER TABLE public.nfes
  ADD COLUMN IF NOT EXISTS numero TEXT;

COMMENT ON COLUMN public.nfes.numero IS 'Número da NF-e extraído do XML ou da API';

-- Criar índice para busca por número
CREATE INDEX IF NOT EXISTS idx_nfes_numero ON public.nfes(numero);
