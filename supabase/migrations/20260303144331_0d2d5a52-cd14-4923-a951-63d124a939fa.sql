-- SEÇÃO 5: accept_carga_tx (versão final com validação de equipamento)
CREATE OR REPLACE FUNCTION public.accept_carga_tx(
  p_carga_id UUID,
  p_motorista_id UUID,
  p_veiculo_id UUID,
  p_carroceria_id UUID,
  p_peso_kg NUMERIC,
  p_valor_frete NUMERIC,
  p_viagem_id UUID,
  p_user_name TEXT,
  p_previsao_coleta TIMESTAMPTZ DEFAULT NULL,
  p_carrocerias_alocadas JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carga RECORD;
  v_peso_disponivel NUMERIC;
  v_novo_peso_disponivel NUMERIC;
  v_novo_status status_carga;
  v_entrega_id UUID;
  v_entrega_codigo TEXT;
  v_viagem_id UUID;
  v_viagem_criada BOOLEAN := FALSE;
  v_nova_ordem INTEGER;
  v_caller_id UUID;
  v_now TIMESTAMPTZ;
  v_viagem_status TEXT;
  v_existing RECORD;
  v_merged_carrocerias JSONB;
  v_existing_arr JSONB;
  v_new_arr JSONB;
  v_item JSONB;
  v_found BOOLEAN;
  v_idx INTEGER;
  v_conflicting_viagem TEXT;
BEGIN
  v_caller_id := auth.uid();
  v_now := NOW();

  -- ETAPA 0: Validar equipamento não em viagem ativa com outro motorista
  IF p_veiculo_id IS NOT NULL THEN
    SELECT v.codigo INTO v_conflicting_viagem
    FROM viagens v
    WHERE v.veiculo_id = p_veiculo_id
      AND v.motorista_id != p_motorista_id
      AND v.status IN ('aguardando', 'programada', 'em_andamento')
    LIMIT 1;

    IF v_conflicting_viagem IS NOT NULL THEN
      RAISE EXCEPTION 'VEICULO_EM_USO: veículo já está na viagem % com outro motorista', v_conflicting_viagem;
    END IF;
  END IF;

  IF p_carrocerias_alocadas IS NOT NULL AND jsonb_array_length(p_carrocerias_alocadas) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_carrocerias_alocadas)
    LOOP
      SELECT v.codigo INTO v_conflicting_viagem
      FROM viagens v
      WHERE v.status IN ('aguardando', 'programada', 'em_andamento')
        AND v.motorista_id != p_motorista_id
        AND (
          v.carroceria_id = (v_item->>'carroceria_id')::uuid
          OR EXISTS (
            SELECT 1 FROM entregas e
            JOIN viagem_entregas ve ON ve.entrega_id = e.id
            WHERE ve.viagem_id = v.id
              AND e.carrocerias_alocadas @> jsonb_build_array(jsonb_build_object('carroceria_id', v_item->>'carroceria_id'))
          )
        )
      LIMIT 1;

      IF v_conflicting_viagem IS NOT NULL THEN
        RAISE EXCEPTION 'CARROCERIA_EM_USO: carroceria já está na viagem % com outro motorista', v_conflicting_viagem;
      END IF;
    END LOOP;
  END IF;

  IF p_carroceria_id IS NOT NULL THEN
    SELECT v.codigo INTO v_conflicting_viagem
    FROM viagens v
    WHERE v.carroceria_id = p_carroceria_id
      AND v.motorista_id != p_motorista_id
      AND v.status IN ('aguardando', 'programada', 'em_andamento')
    LIMIT 1;

    IF v_conflicting_viagem IS NOT NULL THEN
      RAISE EXCEPTION 'CARROCERIA_EM_USO: carroceria já está na viagem % com outro motorista', v_conflicting_viagem;
    END IF;
  END IF;

  -- ETAPA 1: Lock + Validação da Carga
  SELECT * INTO v_carga
  FROM cargas
  WHERE id = p_carga_id
  FOR UPDATE;

  IF v_carga.id IS NULL THEN
    RAISE EXCEPTION 'CARGA_NAO_ENCONTRADA';
  END IF;

  IF v_carga.status NOT IN ('publicada', 'parcialmente_alocada') THEN
    RAISE EXCEPTION 'CARGA_NAO_DISPONIVEL: status atual é %', v_carga.status;
  END IF;

  -- ETAPA 2: Abate Peso
  v_peso_disponivel := COALESCE(v_carga.peso_disponivel_kg, v_carga.peso_kg);
  v_novo_peso_disponivel := v_peso_disponivel - p_peso_kg;

  IF v_novo_peso_disponivel < 0 THEN
    RAISE EXCEPTION 'PESO_EXCEDE_DISPONIVEL: solicitado=% disponivel=%', p_peso_kg, v_peso_disponivel;
  END IF;

  IF v_novo_peso_disponivel <= 0 THEN
    v_novo_status := 'totalmente_alocada'::status_carga;
  ELSE
    v_novo_status := 'parcialmente_alocada'::status_carga;
  END IF;

  UPDATE cargas
  SET peso_disponivel_kg = GREATEST(0, v_novo_peso_disponivel),
      status = v_novo_status,
      updated_at = v_now
  WHERE id = p_carga_id;

  -- ETAPA 2.5: MERGE — mesma carga + mesmo motorista
  SELECT id, peso_alocado_kg, valor_frete, carrocerias_alocadas, codigo
  INTO v_existing
  FROM entregas
  WHERE carga_id = p_carga_id
    AND motorista_id = p_motorista_id
    AND status IN ('aguardando', 'saiu_para_coleta')
  FOR UPDATE
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    v_existing_arr := COALESCE(v_existing.carrocerias_alocadas, '[]'::jsonb);
    v_new_arr := COALESCE(p_carrocerias_alocadas, '[]'::jsonb);
    v_merged_carrocerias := v_existing_arr;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_new_arr)
    LOOP
      v_found := FALSE;
      FOR v_idx IN 0..jsonb_array_length(v_merged_carrocerias) - 1
      LOOP
        IF v_merged_carrocerias->v_idx->>'carroceria_id' = v_item->>'carroceria_id' THEN
          v_merged_carrocerias := jsonb_set(
            v_merged_carrocerias,
            ARRAY[v_idx::text, 'peso_kg'],
            to_jsonb(
              COALESCE((v_merged_carrocerias->v_idx->>'peso_kg')::numeric, 0) +
              COALESCE((v_item->>'peso_kg')::numeric, 0)
            )
          );
          v_found := TRUE;
          EXIT;
        END IF;
      END LOOP;

      IF NOT v_found THEN
        v_merged_carrocerias := v_merged_carrocerias || jsonb_build_array(v_item);
      END IF;
    END LOOP;

    UPDATE entregas SET
      peso_alocado_kg = COALESCE(v_existing.peso_alocado_kg, 0) + p_peso_kg,
      valor_frete = COALESCE(v_existing.valor_frete, 0) + COALESCE(p_valor_frete, 0),
      carrocerias_alocadas = CASE 
        WHEN jsonb_array_length(v_merged_carrocerias) > 0 THEN v_merged_carrocerias 
        ELSE NULL 
      END,
      updated_at = v_now
    WHERE id = v_existing.id;

    INSERT INTO entrega_eventos (
      entrega_id, tipo, timestamp, observacao, user_id, user_nome
    ) VALUES (
      v_existing.id, 'atualizacao', v_now,
      'Peso adicional alocado (mais ' || ROUND(p_peso_kg, 4) || ' kg)',
      v_caller_id, p_user_name
    );

    RETURN jsonb_build_object(
      'success', TRUE,
      'merged', TRUE,
      'entrega_id', v_existing.id,
      'entrega_codigo', v_existing.codigo,
      'carga_status', v_novo_status,
      'peso_disponivel_restante', GREATEST(0, v_novo_peso_disponivel),
      'mensagem', 'Peso adicionado à entrega existente (' || COALESCE(v_existing.codigo, v_existing.id::text) || ')'
    );
  END IF;

  -- ETAPA 3: Criar Entrega
  INSERT INTO entregas (
    carga_id, motorista_id, veiculo_id, carroceria_id,
    peso_alocado_kg, valor_frete, status,
    created_by, updated_by, previsao_coleta, carrocerias_alocadas
  ) VALUES (
    p_carga_id, p_motorista_id, p_veiculo_id, p_carroceria_id,
    p_peso_kg, p_valor_frete, 'aguardando'::status_entrega,
    v_caller_id, v_caller_id, p_previsao_coleta, p_carrocerias_alocadas
  )
  RETURNING id, codigo INTO v_entrega_id, v_entrega_codigo;

  -- ETAPA 4: Eventos
  INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_id, user_nome)
  VALUES (v_entrega_id, 'criado', v_now, 'Entrega criada', v_caller_id, p_user_name);

  INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_id, user_nome)
  VALUES (v_entrega_id, 'aceite', v_now + INTERVAL '1 millisecond', 'Status inicial definido automaticamente', NULL, 'Sistema');

  -- ETAPA 5: Viagem
  IF p_viagem_id IS NOT NULL THEN
    SELECT status INTO v_viagem_status FROM viagens WHERE id = p_viagem_id FOR UPDATE;
    IF v_viagem_status IS NULL THEN
      p_viagem_id := NULL;
    ELSIF v_viagem_status IN ('finalizada', 'cancelada') THEN
      p_viagem_id := NULL;
    END IF;
  END IF;

  IF p_viagem_id IS NULL THEN
    INSERT INTO viagens (motorista_id, veiculo_id, carroceria_id, status, started_at, codigo)
    VALUES (p_motorista_id, p_veiculo_id, p_carroceria_id, 'aguardando', v_now, '')
    RETURNING id INTO v_viagem_id;
    v_viagem_criada := TRUE;
    INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem) VALUES (v_viagem_id, v_entrega_id, 1);
  ELSE
    v_viagem_id := p_viagem_id;
    SELECT COALESCE(MAX(ordem), 0) + 1 INTO v_nova_ordem FROM viagem_entregas WHERE viagem_id = p_viagem_id;
    INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem) VALUES (p_viagem_id, v_entrega_id, v_nova_ordem);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'merged', FALSE,
    'entrega_id', v_entrega_id,
    'entrega_codigo', v_entrega_codigo,
    'viagem_id', v_viagem_id,
    'viagem_criada', v_viagem_criada,
    'carga_status', v_novo_status,
    'peso_disponivel_restante', GREATEST(0, v_novo_peso_disponivel),
    'mensagem', 'Carga aceita com sucesso!'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- SEÇÃO 6: Trigger proteger_finalizacao_viagem
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
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status NOT IN ('entregue', 'cancelada');
    
    IF v_entregas_pendentes > 0 THEN
      RAISE EXCEPTION 'VIAGEM_COM_ENTREGAS_PENDENTES: % entrega(s) ainda não finalizada(s)', v_entregas_pendentes;
    END IF;

    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text)) INTO v_entrega_sem_canhoto
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status = 'entregue'
      AND (e.canhoto_url IS NULL OR e.canhoto_url = '');

    IF v_entrega_sem_canhoto IS NOT NULL AND array_length(v_entrega_sem_canhoto, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_CANHOTO: Entrega(s) sem canhoto: %', array_to_string(v_entrega_sem_canhoto, ', ');
    END IF;

    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text)) INTO v_entrega_sem_nfe
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status = 'entregue'
      AND NOT EXISTS (SELECT 1 FROM nfes n WHERE n.entrega_id = e.id);

    IF v_entrega_sem_nfe IS NOT NULL AND array_length(v_entrega_sem_nfe, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_NFE: Entrega(s) sem nota fiscal: %', array_to_string(v_entrega_sem_nfe, ', ');
    END IF;

    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text)) INTO v_entrega_sem_cte
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status = 'entregue'
      AND NOT EXISTS (SELECT 1 FROM ctes c WHERE c.entrega_id = e.id);

    IF v_entrega_sem_cte IS NOT NULL AND array_length(v_entrega_sem_cte, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_CTE: Entrega(s) sem CT-e: %', array_to_string(v_entrega_sem_cte, ', ');
    END IF;

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

DROP TRIGGER IF EXISTS trg_proteger_finalizacao_viagem ON public.viagens;
CREATE TRIGGER trg_proteger_finalizacao_viagem
  BEFORE UPDATE ON public.viagens
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_finalizacao_viagem();