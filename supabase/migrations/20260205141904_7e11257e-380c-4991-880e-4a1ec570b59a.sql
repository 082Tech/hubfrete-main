-- Cria função para restaurar peso quando entrega é cancelada
CREATE OR REPLACE FUNCTION public.release_weight_on_entrega_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_carga RECORD;
  v_peso_alocado NUMERIC;
  v_novo_peso_disponivel NUMERIC;
  v_novo_status status_carga;
BEGIN
  -- Só executa se status mudou para 'cancelada'
  IF NEW.status != 'cancelada' OR OLD.status = 'cancelada' THEN
    RETURN NEW;
  END IF;
  
  -- Get the peso_alocado from the cancelled entrega
  v_peso_alocado := COALESCE(OLD.peso_alocado_kg, 0);
  
  -- Skip if no weight was allocated
  IF v_peso_alocado <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Lock and get current cargo data
  SELECT id, peso_kg, peso_disponivel_kg, status
  INTO v_carga
  FROM public.cargas
  WHERE id = NEW.carga_id
  FOR UPDATE;
  
  -- Skip if cargo not found
  IF v_carga.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate new available weight
  v_novo_peso_disponivel := COALESCE(v_carga.peso_disponivel_kg, 0) + v_peso_alocado;
  
  -- Ensure we don't exceed total weight
  IF v_novo_peso_disponivel > v_carga.peso_kg THEN
    v_novo_peso_disponivel := v_carga.peso_kg;
  END IF;
  
  -- Determine new status (properly typed as enum)
  IF v_novo_peso_disponivel >= v_carga.peso_kg THEN
    v_novo_status := 'publicada'::status_carga;
  ELSE
    v_novo_status := 'parcialmente_alocada'::status_carga;
  END IF;
  
  -- Update the cargo
  UPDATE public.cargas
  SET peso_disponivel_kg = v_novo_peso_disponivel,
      status = v_novo_status,
      updated_at = NOW()
  WHERE id = NEW.carga_id;
  
  -- Zerar o peso alocado na entrega cancelada
  NEW.peso_alocado_kg := 0;
  
  RETURN NEW;
END;
$function$;

-- Cria trigger para executar a função quando status mudar para cancelada
DROP TRIGGER IF EXISTS trigger_release_weight_on_entrega_cancel ON public.entregas;

CREATE TRIGGER trigger_release_weight_on_entrega_cancel
BEFORE UPDATE OF status ON public.entregas
FOR EACH ROW
EXECUTE FUNCTION release_weight_on_entrega_cancel();