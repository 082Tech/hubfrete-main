
CREATE OR REPLACE FUNCTION public.proteger_finalizacao_viagem()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entregas_pendentes INT;
  v_entrega_sem_canhoto TEXT[];
  v_entrega_sem_nfe TEXT[];
  v_entrega_sem_cte TEXT[];
  v_sem_manifesto BOOLEAN;
BEGIN
  -- Só validar quando status muda para 'finalizada'
  IF NEW.status = 'finalizada' AND (OLD.status IS NULL OR OLD.status != 'finalizada') THEN
    
    -- 1. Verificar entregas pendentes (não entregue/cancelada)
    SELECT COUNT(*)
    INTO v_entregas_pendentes
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status NOT IN ('entregue', 'cancelada');
    
    IF v_entregas_pendentes > 0 THEN
      RAISE EXCEPTION 'VIAGEM_COM_ENTREGAS_PENDENTES: % entrega(s) ainda não finalizada(s)', v_entregas_pendentes;
    END IF;

    -- 2. Verificar canhoto em cada entrega entregue
    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text))
    INTO v_entrega_sem_canhoto
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status = 'entregue'
      AND (e.canhoto_url IS NULL OR e.canhoto_url = '');

    IF v_entrega_sem_canhoto IS NOT NULL AND array_length(v_entrega_sem_canhoto, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_CANHOTO: Entrega(s) sem canhoto: %', array_to_string(v_entrega_sem_canhoto, ', ');
    END IF;

    -- 3. Verificar NF-e em cada entrega entregue
    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text))
    INTO v_entrega_sem_nfe
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status = 'entregue'
      AND NOT EXISTS (
        SELECT 1 FROM nfes n WHERE n.entrega_id = e.id
      );

    IF v_entrega_sem_nfe IS NOT NULL AND array_length(v_entrega_sem_nfe, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_NFE: Entrega(s) sem nota fiscal: %', array_to_string(v_entrega_sem_nfe, ', ');
    END IF;

    -- 4. Verificar CT-e em cada entrega entregue
    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text))
    INTO v_entrega_sem_cte
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status = 'entregue'
      AND NOT EXISTS (
        SELECT 1 FROM ctes c WHERE c.entrega_id = e.id
      );

    IF v_entrega_sem_cte IS NOT NULL AND array_length(v_entrega_sem_cte, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_CTE: Entrega(s) sem CT-e: %', array_to_string(v_entrega_sem_cte, ', ');
    END IF;

    -- 5. Verificar se há pelo menos um manifesto (MDF-e) na viagem
    SELECT NOT EXISTS (
      SELECT 1 FROM mdfes m WHERE m.viagem_id = NEW.id
    ) INTO v_sem_manifesto;

    IF v_sem_manifesto THEN
      RAISE EXCEPTION 'VIAGEM_SEM_MANIFESTO: A viagem não possui nenhum MDF-e (Manifesto) anexado';
    END IF;

  END IF;
  
  RETURN NEW;
END;
$function$;
