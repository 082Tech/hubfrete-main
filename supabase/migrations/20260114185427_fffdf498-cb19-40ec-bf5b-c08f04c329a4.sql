-- Adicionar suporte a cargas fracionadas na tabela cargas
ALTER TABLE public.cargas 
ADD COLUMN IF NOT EXISTS peso_disponivel_kg numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS permite_fracionado boolean DEFAULT true;

-- Adicionar peso alocado na tabela entregas
ALTER TABLE public.entregas 
ADD COLUMN IF NOT EXISTS peso_alocado_kg numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS valor_frete numeric DEFAULT NULL;

-- Criar trigger para atualizar peso_disponivel_kg quando uma entrega é criada/atualizada
CREATE OR REPLACE FUNCTION public.update_carga_peso_disponivel()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma entrega é inserida ou atualizada
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.cargas
    SET peso_disponivel_kg = peso_kg - COALESCE((
      SELECT SUM(peso_alocado_kg) 
      FROM public.entregas 
      WHERE carga_id = NEW.carga_id
    ), 0)
    WHERE id = NEW.carga_id;
    RETURN NEW;
  END IF;
  
  -- Quando uma entrega é deletada
  IF TG_OP = 'DELETE' THEN
    UPDATE public.cargas
    SET peso_disponivel_kg = peso_kg - COALESCE((
      SELECT SUM(peso_alocado_kg) 
      FROM public.entregas 
      WHERE carga_id = OLD.carga_id
    ), 0)
    WHERE id = OLD.carga_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger na tabela entregas
DROP TRIGGER IF EXISTS trigger_update_peso_disponivel ON public.entregas;
CREATE TRIGGER trigger_update_peso_disponivel
AFTER INSERT OR UPDATE OR DELETE ON public.entregas
FOR EACH ROW
EXECUTE FUNCTION public.update_carga_peso_disponivel();

-- Inicializar peso_disponivel_kg para cargas existentes
UPDATE public.cargas
SET peso_disponivel_kg = peso_kg - COALESCE((
  SELECT SUM(peso_alocado_kg) 
  FROM public.entregas 
  WHERE carga_id = cargas.id
), 0)
WHERE peso_disponivel_kg IS NULL;