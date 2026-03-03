-- SEÇÃO 1: Novas colunas
-- entregas: previsão de coleta
ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS previsao_coleta TIMESTAMP WITH TIME ZONE;

-- carrocerias: vínculo com veículo
ALTER TABLE public.carrocerias
  ADD COLUMN IF NOT EXISTS veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_carrocerias_veiculo_id ON public.carrocerias(veiculo_id);

-- veiculos: motorista padrão
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS motorista_padrao_id UUID REFERENCES public.motoristas(id);

-- SEÇÃO 3: Alteração de tipo (INTEGER → NUMERIC)
ALTER TABLE public.cargas
  ALTER COLUMN peso_kg TYPE NUMERIC(12,4),
  ALTER COLUMN peso_disponivel_kg TYPE NUMERIC(12,4),
  ALTER COLUMN peso_minimo_fracionado_kg TYPE NUMERIC(12,4);

ALTER TABLE public.entregas
  ALTER COLUMN peso_alocado_kg TYPE NUMERIC(12,4);

ALTER TABLE public.carrocerias
  ALTER COLUMN capacidade_kg TYPE NUMERIC(12,4);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'veiculos' AND column_name = 'capacidade_kg'
  ) THEN
    EXECUTE 'ALTER TABLE public.veiculos ALTER COLUMN capacidade_kg TYPE NUMERIC(12,4)';
  END IF;
END $$;