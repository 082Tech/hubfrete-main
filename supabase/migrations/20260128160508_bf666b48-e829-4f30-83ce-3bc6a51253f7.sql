-- Fix the trigger function to properly cast status to enum
CREATE OR REPLACE FUNCTION public.release_weight_on_entrega_delete()
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
  WHERE id = OLD.carga_id;
  
  RETURN OLD;
END;
$function$;

-- Now delete the entrega
DELETE FROM entregas WHERE id = '6d3aa339-6542-4cf2-9e0e-43833f83ebff';