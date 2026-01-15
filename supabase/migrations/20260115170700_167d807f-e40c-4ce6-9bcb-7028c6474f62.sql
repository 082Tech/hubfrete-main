-- 1. Criar enum para status da fração
CREATE TYPE public.status_fracao AS ENUM (
  'confirmada',      -- Motorista aceitou
  'em_coleta',       -- Indo buscar
  'em_transito',     -- Transportando
  'concluida',       -- Finalizada com sucesso
  'cancelada'        -- Cancelada
);

-- 2. Criar tabela carga_fracoes
CREATE TABLE public.carga_fracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carga_id UUID NOT NULL REFERENCES public.cargas(id) ON DELETE CASCADE,
  motorista_id UUID REFERENCES public.motoristas(id),
  veiculo_id UUID REFERENCES public.veiculos(id),
  peso_alocado NUMERIC NOT NULL,
  valor_frete NUMERIC,
  status public.status_fracao NOT NULL DEFAULT 'confirmada',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.carga_fracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.carga_fracoes
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Trigger para updated_at
CREATE TRIGGER update_carga_fracoes_updated_at
BEFORE UPDATE ON public.carga_fracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- 5. Adicionar FK na tabela entregas
ALTER TABLE public.entregas
ADD COLUMN carga_fracao_id UUID REFERENCES public.carga_fracoes(id);

-- 6. Criar trigger para atualizar peso_disponivel_kg baseado em carga_fracoes
CREATE OR REPLACE FUNCTION public.update_carga_peso_from_fracao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.cargas
    SET peso_disponivel_kg = peso_kg - COALESCE((
      SELECT SUM(peso_alocado) 
      FROM public.carga_fracoes 
      WHERE carga_id = NEW.carga_id
        AND status != 'cancelada'
    ), 0)
    WHERE id = NEW.carga_id;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE public.cargas
    SET peso_disponivel_kg = peso_kg - COALESCE((
      SELECT SUM(peso_alocado) 
      FROM public.carga_fracoes 
      WHERE carga_id = OLD.carga_id
        AND status != 'cancelada'
    ), 0)
    WHERE id = OLD.carga_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_carga_peso_fracao
AFTER INSERT OR UPDATE OR DELETE ON public.carga_fracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_carga_peso_from_fracao();

-- 7. Migrar dados existentes de entregas para carga_fracoes
INSERT INTO public.carga_fracoes (carga_id, motorista_id, veiculo_id, peso_alocado, valor_frete, status, created_at)
SELECT 
  e.carga_id,
  e.motorista_id,
  e.veiculo_id,
  COALESCE(e.peso_alocado_kg, 0),
  e.valor_frete,
  CASE 
    WHEN e.status = 'entregue' THEN 'concluida'::status_fracao
    WHEN e.status = 'devolvida' THEN 'cancelada'::status_fracao
    WHEN e.status = 'problema' THEN 'cancelada'::status_fracao
    WHEN e.status = 'em_transito' THEN 'em_transito'::status_fracao
    WHEN e.status = 'em_coleta' THEN 'em_coleta'::status_fracao
    ELSE 'confirmada'::status_fracao
  END,
  e.created_at
FROM public.entregas e;

-- 8. Atualizar entregas com referência às frações criadas
UPDATE public.entregas e
SET carga_fracao_id = cf.id
FROM public.carga_fracoes cf
WHERE e.carga_id = cf.carga_id
  AND e.motorista_id = cf.motorista_id
  AND e.created_at = cf.created_at;

-- 9. Remover trigger antigo que usava entregas para calcular peso
DROP TRIGGER IF EXISTS trigger_update_peso_disponivel ON public.entregas;
DROP FUNCTION IF EXISTS public.update_carga_peso_disponivel();

-- 10. Comentar as colunas para documentação
COMMENT ON TABLE public.carga_fracoes IS 'Frações de carga aceitas por motoristas. Cada fração representa uma porção do peso total da carga.';
COMMENT ON COLUMN public.carga_fracoes.peso_alocado IS 'Peso em kg que o motorista aceitou transportar desta carga.';
COMMENT ON COLUMN public.carga_fracoes.status IS 'Status da fração: confirmada (aceita), em_coleta, em_transito, concluida, cancelada.';