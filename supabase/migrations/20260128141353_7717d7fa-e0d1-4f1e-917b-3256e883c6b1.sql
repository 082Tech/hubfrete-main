-- Create trigger function to automatically release weight when entrega is deleted
CREATE OR REPLACE FUNCTION public.release_weight_on_entrega_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_carga RECORD;
  v_peso_alocado NUMERIC;
  v_novo_peso_disponivel NUMERIC;
  v_novo_status TEXT;
BEGIN
  -- Get the peso_alocado from the deleted entrega
  v_peso_alocado := COALESCE(OLD.peso_alocado_kg, 0);
  
  -- Skip if no weight was allocated
  IF v_peso_alocado <= 0 THEN
    RETURN OLD;
  END IF;
  
  -- Lock and get current cargo data
  SELECT id, peso_kg, peso_disponivel_kg, status
  INTO v_carga
  FROM public.cargas
  WHERE id = OLD.carga_id
  FOR UPDATE;
  
  -- Skip if cargo not found
  IF v_carga.id IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Calculate new available weight
  v_novo_peso_disponivel := COALESCE(v_carga.peso_disponivel_kg, 0) + v_peso_alocado;
  
  -- Ensure we don't exceed total weight
  IF v_novo_peso_disponivel > v_carga.peso_kg THEN
    v_novo_peso_disponivel := v_carga.peso_kg;
  END IF;
  
  -- Determine new status
  IF v_novo_peso_disponivel >= v_carga.peso_kg THEN
    v_novo_status := 'publicada';
  ELSE
    v_novo_status := 'parcialmente_alocada';
  END IF;
  
  -- Update the cargo
  UPDATE public.cargas
  SET peso_disponivel_kg = v_novo_peso_disponivel,
      status = v_novo_status,
      updated_at = NOW()
  WHERE id = OLD.carga_id;
  
  RETURN OLD;
END;
$$;

-- Create the trigger (BEFORE DELETE to ensure it runs before cascade deletes)
DROP TRIGGER IF EXISTS trigger_release_weight_on_entrega_delete ON public.entregas;
CREATE TRIGGER trigger_release_weight_on_entrega_delete
  BEFORE DELETE ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.release_weight_on_entrega_delete();