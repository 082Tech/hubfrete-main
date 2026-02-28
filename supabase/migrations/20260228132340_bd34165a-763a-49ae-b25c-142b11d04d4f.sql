
CREATE OR REPLACE FUNCTION public.accept_carga_tx(
  p_carga_id UUID,
  p_motorista_id UUID,
  p_veiculo_id UUID,
  p_carroceria_id UUID,
  p_peso_kg INTEGER,
  p_valor_frete NUMERIC DEFAULT NULL,
  p_viagem_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT 'Sistema',
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
    -- *** VALIDAÇÃO: Verificar se a viagem ainda está ativa ***
    SELECT status INTO v_viagem_status
    FROM viagens
    WHERE id = p_viagem_id
    FOR UPDATE;

    IF v_viagem_status IS NULL THEN
      -- Viagem não existe mais, criar nova
      p_viagem_id := NULL;
    ELSIF v_viagem_status IN ('finalizada', 'cancelada') THEN
      -- Viagem já finalizada/cancelada — NÃO anexar, criar nova
      RAISE NOTICE 'Viagem % está com status %, criando nova viagem', p_viagem_id, v_viagem_status;
      p_viagem_id := NULL;
    END IF;
  END IF;

  IF p_viagem_id IS NULL THEN
    -- Criar nova viagem com status 'aguardando'
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
    -- Anexar entrega a viagem existente (já validada como ativa)
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
