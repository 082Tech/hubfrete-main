ALTER TABLE public.cargas
  ADD COLUMN IF NOT EXISTS unidade_precificacao text DEFAULT 'TON',
  ADD COLUMN IF NOT EXISTS quantidade_precificacao numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_unitario_precificacao numeric DEFAULT NULL;