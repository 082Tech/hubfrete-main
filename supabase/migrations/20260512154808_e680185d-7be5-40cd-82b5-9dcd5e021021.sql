
-- 1) ENTREGAS: conferência de NFe + canhoto digital
ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS nfes_conferencia_status text DEFAULT 'pendente'
    CHECK (nfes_conferencia_status IN ('pendente','ok','divergente')),
  ADD COLUMN IF NOT EXISTS nfes_conferidas_em timestamptz,
  ADD COLUMN IF NOT EXISTS nfes_conferidas_por uuid,
  ADD COLUMN IF NOT EXISTS nfes_conferencia_observacao text,
  ADD COLUMN IF NOT EXISTS canhoto_assinatura_base64 text,
  ADD COLUMN IF NOT EXISTS canhoto_latitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS canhoto_longitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS canhoto_assinado_em timestamptz,
  ADD COLUMN IF NOT EXISTS canhoto_dispositivo_info jsonb;

-- 2) CTES: UF de destino para agrupamento de manifestos
ALTER TABLE public.ctes
  ADD COLUMN IF NOT EXISTS uf_destino text,
  ADD COLUMN IF NOT EXISTS uf_origem text,
  ADD COLUMN IF NOT EXISTS viagem_id uuid;

CREATE INDEX IF NOT EXISTS idx_ctes_viagem_uf ON public.ctes(viagem_id, uf_destino) WHERE focus_status = 'autorizado';
CREATE INDEX IF NOT EXISTS idx_ctes_entrega_status ON public.ctes(entrega_id, focus_status);

-- 3) MDFES: índice único por (viagem, uf_fim) ativo
CREATE UNIQUE INDEX IF NOT EXISTS uq_mdfes_viagem_uf_ativo
  ON public.mdfes(viagem_id, uf_fim)
  WHERE status NOT IN ('cancelado','erro');

-- 4) Helper: invocar Edge Function via pg_net
CREATE OR REPLACE FUNCTION public._invoke_edge_function(p_function_name text, p_payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id bigint;
  v_url text;
  v_anon_key text;
BEGIN
  v_url := 'https://ublyithvarvtqbwmxtyh.supabase.co/functions/v1/' || p_function_name;
  v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVibHlpdGh2YXJ2dHFid214dHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTIwMzYsImV4cCI6MjA4NjU2ODAzNn0.vTOdUsHUa32L3QdK4nVaumLqTXbjalOvcd7Mr9Dz5yU';

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon_key,
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := p_payload,
    timeout_milliseconds := 30000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- 5) Trigger: emite CT-e ao confirmar conferência
CREATE OR REPLACE FUNCTION public.fn_emitir_cte_apos_conferencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nfes_conferencia_status = 'ok'
     AND (OLD.nfes_conferencia_status IS DISTINCT FROM 'ok')
     AND NOT EXISTS (
       SELECT 1 FROM public.ctes
        WHERE entrega_id = NEW.id
          AND focus_status NOT IN ('cancelado','erro')
     )
  THEN
    PERFORM public._invoke_edge_function(
      'focusnfe-cte',
      jsonb_build_object('action','emit','entrega_id', NEW.id,'origem','auto_trigger')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emitir_cte_apos_conferencia ON public.entregas;
CREATE TRIGGER trg_emitir_cte_apos_conferencia
  AFTER UPDATE OF nfes_conferencia_status ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_emitir_cte_apos_conferencia();

-- 6) Trigger: emite MDF-e por UF da viagem
CREATE OR REPLACE FUNCTION public.fn_emitir_mdfe_por_uf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viagem_id uuid;
  v_uf_destino text;
  v_uf_origem text;
  v_pendentes int;
  v_existe_mdfe_ativo boolean;
BEGIN
  IF NEW.focus_status IS DISTINCT FROM 'autorizado' THEN
    RETURN NEW;
  END IF;

  IF NEW.viagem_id IS NULL OR NEW.uf_destino IS NULL THEN
    SELECT ve.viagem_id, ed.estado, eo.estado
      INTO v_viagem_id, v_uf_destino, v_uf_origem
      FROM public.entregas e
      LEFT JOIN public.viagem_entregas ve ON ve.entrega_id = e.id
      LEFT JOIN public.enderecos_carga ed ON ed.carga_id = e.carga_id AND ed.tipo = 'entrega'
      LEFT JOIN public.enderecos_carga eo ON eo.carga_id = e.carga_id AND eo.tipo = 'coleta'
     WHERE e.id = NEW.entrega_id
     LIMIT 1;

    UPDATE public.ctes
       SET viagem_id = COALESCE(viagem_id, v_viagem_id),
           uf_destino = COALESCE(uf_destino, v_uf_destino),
           uf_origem = COALESCE(uf_origem, v_uf_origem)
     WHERE id = NEW.id;
  ELSE
    v_viagem_id := NEW.viagem_id;
    v_uf_destino := NEW.uf_destino;
  END IF;

  IF v_viagem_id IS NULL OR v_uf_destino IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO v_pendentes
    FROM public.viagem_entregas ve
    JOIN public.entregas e ON e.id = ve.entrega_id
    JOIN public.enderecos_carga ed ON ed.carga_id = e.carga_id AND ed.tipo = 'entrega'
   WHERE ve.viagem_id = v_viagem_id
     AND ed.estado = v_uf_destino
     AND e.status NOT IN ('cancelada')
     AND NOT EXISTS (
       SELECT 1 FROM public.ctes c
        WHERE c.entrega_id = e.id AND c.focus_status = 'autorizado'
     );

  SELECT EXISTS (
    SELECT 1 FROM public.mdfes
     WHERE viagem_id = v_viagem_id
       AND uf_fim = v_uf_destino
       AND status NOT IN ('cancelado','erro')
  ) INTO v_existe_mdfe_ativo;

  IF v_pendentes = 0 AND NOT v_existe_mdfe_ativo THEN
    PERFORM public._invoke_edge_function(
      'focusnfe-mdfe',
      jsonb_build_object('action','emit','viagem_id', v_viagem_id,'uf_destino', v_uf_destino,'origem','auto_trigger')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emitir_mdfe_por_uf ON public.ctes;
CREATE TRIGGER trg_emitir_mdfe_por_uf
  AFTER INSERT OR UPDATE OF focus_status ON public.ctes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_emitir_mdfe_por_uf();

-- 7) proteger_finalizacao_viagem aceita canhoto digital
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
  IF NEW.status = 'finalizada' AND (OLD.status IS NULL OR OLD.status != 'finalizada') THEN

    SELECT COUNT(*) INTO v_entregas_pendentes
    FROM viagem_entregas ve JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id AND e.status NOT IN ('entregue', 'cancelada');
    IF v_entregas_pendentes > 0 THEN
      RAISE EXCEPTION 'VIAGEM_COM_ENTREGAS_PENDENTES: % entrega(s) ainda não finalizada(s)', v_entregas_pendentes;
    END IF;

    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text))
    INTO v_entrega_sem_canhoto
    FROM viagem_entregas ve JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id AND e.status = 'entregue'
      AND COALESCE(e.canhoto_url,'') = ''
      AND (e.canhoto_assinatura_base64 IS NULL OR e.canhoto_latitude IS NULL OR e.canhoto_longitude IS NULL);
    IF v_entrega_sem_canhoto IS NOT NULL AND array_length(v_entrega_sem_canhoto, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_CANHOTO: Entrega(s) sem canhoto (assinatura+GPS ou arquivo): %', array_to_string(v_entrega_sem_canhoto, ', ');
    END IF;

    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text)) INTO v_entrega_sem_nfe
    FROM viagem_entregas ve JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id AND e.status = 'entregue'
      AND NOT EXISTS (SELECT 1 FROM nfes n WHERE n.entrega_id = e.id);
    IF v_entrega_sem_nfe IS NOT NULL AND array_length(v_entrega_sem_nfe, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_NFE: Entrega(s) sem nota fiscal: %', array_to_string(v_entrega_sem_nfe, ', ');
    END IF;

    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text)) INTO v_entrega_sem_cte
    FROM viagem_entregas ve JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id AND e.status = 'entregue'
      AND NOT EXISTS (SELECT 1 FROM ctes c WHERE c.entrega_id = e.id AND c.focus_status = 'autorizado');
    IF v_entrega_sem_cte IS NOT NULL AND array_length(v_entrega_sem_cte, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_CTE: Entrega(s) sem CT-e autorizado: %', array_to_string(v_entrega_sem_cte, ', ');
    END IF;

    SELECT NOT EXISTS (
      SELECT 1 FROM mdfes m
       WHERE m.viagem_id = NEW.id AND m.status NOT IN ('cancelado','erro')
    ) INTO v_sem_manifesto;
    IF v_sem_manifesto THEN
      RAISE EXCEPTION 'VIAGEM_SEM_MANIFESTO: A viagem não possui MDF-e ativo';
    END IF;

  END IF;
  RETURN NEW;
END;
$function$;
