
CREATE OR REPLACE FUNCTION public.accept_carga_tx(
  p_carga_id uuid,
  p_motorista_id uuid,
  p_veiculo_id uuid,
  p_carroceria_id uuid,
  p_peso_kg integer,
  p_valor_frete numeric DEFAULT NULL::numeric,
  p_viagem_id uuid DEFAULT NULL::uuid,
  p_user_name text DEFAULT 'Sistema'::text,
  p_previsao_coleta timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_carrocerias_alocadas jsonb DEFAULT NULL::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Merge variables
  v_existing RECORD;
  v_merged_carrocerias JSONB;
  v_existing_arr JSONB;
  v_new_arr JSONB;
  v_item JSONB;
  v_found BOOLEAN;
  v_idx INTEGER;
BEGIN
  v_caller_id := auth.uid();
  v_now := NOW();

  -- ═══════════════════════════════════════════════════════
  -- ETAPA 1: Lock + Validação da Carga
  -- ═══════════════════════════════════════════════════════
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

  -- ═══════════════════════════════════════════════════════
  -- ETAPA 2: Abate Peso na Carga
  -- ═══════════════════════════════════════════════════════
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

  -- ═══════════════════════════════════════════════════════
  -- ETAPA 2.5: Verificar MERGE — mesma carga + mesmo motorista
  -- ═══════════════════════════════════════════════════════
  SELECT id, peso_alocado_kg, valor_frete, carrocerias_alocadas, codigo
  INTO v_existing
  FROM entregas
  WHERE carga_id = p_carga_id
    AND motorista_id = p_motorista_id
    AND status IN ('aguardando', 'saiu_para_coleta')
  FOR UPDATE
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    -- *** MERGE: somar peso e valor ***
    
    -- Merge carrocerias_alocadas JSON arrays
    v_existing_arr := COALESCE(v_existing.carrocerias_alocadas, '[]'::jsonb);
    v_new_arr := COALESCE(p_carrocerias_alocadas, '[]'::jsonb);
    v_merged_carrocerias := v_existing_arr;

    -- For each new carroceria, find matching or append
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_new_arr)
    LOOP
      v_found := FALSE;
      FOR v_idx IN 0..jsonb_array_length(v_merged_carrocerias) - 1
      LOOP
        IF v_merged_carrocerias->v_idx->>'carroceria_id' = v_item->>'carroceria_id' THEN
          -- Sum peso_kg for matching carroceria
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

    -- Evento de timeline
    INSERT INTO entrega_eventos (
      entrega_id, tipo, timestamp, observacao, user_id, user_nome
    ) VALUES (
      v_existing.id, 'atualizacao', v_now,
      'Peso adicional alocado (mais ' || p_peso_kg || ' kg)',
      v_caller_id, p_user_name
    );

    -- Retornar com merged = true (pular criação de viagem/chat)
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

  -- ═══════════════════════════════════════════════════════
  -- ETAPA 3: Criar Entrega (código gerado por trigger)
  -- ═══════════════════════════════════════════════════════
  INSERT INTO entregas (
    carga_id,
    motorista_id,
    veiculo_id,
    carroceria_id,
    peso_alocado_kg,
    valor_frete,
    status,
    created_by,
    updated_by,
    previsao_coleta,
    carrocerias_alocadas
  ) VALUES (
    p_carga_id,
    p_motorista_id,
    p_veiculo_id,
    p_carroceria_id,
    p_peso_kg,
    p_valor_frete,
    'aguardando'::status_entrega,
    v_caller_id,
    v_caller_id,
    p_previsao_coleta,
    p_carrocerias_alocadas
  )
  RETURNING id, codigo INTO v_entrega_id, v_entrega_codigo;

  -- ═══════════════════════════════════════════════════════
  -- ETAPA 4: Registrar Eventos na Timeline
  -- ═══════════════════════════════════════════════════════
  INSERT INTO entrega_eventos (
    entrega_id, tipo, timestamp, observacao, user_id, user_nome
  ) VALUES (
    v_entrega_id, 'criado', v_now, 'Entrega criada', v_caller_id, p_user_name
  );

  INSERT INTO entrega_eventos (
    entrega_id, tipo, timestamp, observacao, user_id, user_nome
  ) VALUES (
    v_entrega_id, 'aceite', v_now + INTERVAL '1 millisecond',
    'Status inicial definido automaticamente', NULL, 'Sistema'
  );

  -- ═══════════════════════════════════════════════════════
  -- ETAPA 5: Viagem — Criar nova ou anexar a existente
  -- ═══════════════════════════════════════════════════════
  
  IF p_viagem_id IS NOT NULL THEN
    SELECT status INTO v_viagem_status
    FROM viagens
    WHERE id = p_viagem_id
    FOR UPDATE;

    IF v_viagem_status IS NULL THEN
      p_viagem_id := NULL;
    ELSIF v_viagem_status IN ('finalizada', 'cancelada') THEN
      RAISE NOTICE 'Viagem % está com status %, criando nova viagem', p_viagem_id, v_viagem_status;
      p_viagem_id := NULL;
    END IF;
  END IF;

  IF p_viagem_id IS NULL THEN
    INSERT INTO viagens (
      motorista_id,
      veiculo_id,
      carroceria_id,
      status,
      started_at,
      codigo
    ) VALUES (
      p_motorista_id,
      p_veiculo_id,
      p_carroceria_id,
      'aguardando',
      v_now,
      ''
    )
    RETURNING id INTO v_viagem_id;

    v_viagem_criada := TRUE;

    INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem)
    VALUES (v_viagem_id, v_entrega_id, 1);

  ELSE
    v_viagem_id := p_viagem_id;

    SELECT COALESCE(MAX(ordem), 0) + 1
    INTO v_nova_ordem
    FROM viagem_entregas
    WHERE viagem_id = p_viagem_id;

    INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem)
    VALUES (p_viagem_id, v_entrega_id, v_nova_ordem);
  END IF;

  -- ═══════════════════════════════════════════════════════
  -- RETORNO
  -- ═══════════════════════════════════════════════════════
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
$function$;
