
-- Update notify_entrega_status_change to use new terminology labels
CREATE OR REPLACE FUNCTION public.notify_entrega_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_carga RECORD;
  v_motorista_nome TEXT;
  v_status_label TEXT;
  v_empresa_usuario RECORD;
  v_embarcador_usuario RECORD;
BEGIN
  -- Only process status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get carga info
  SELECT c.codigo, c.empresa_id, c.descricao
  INTO v_carga
  FROM public.cargas c
  WHERE c.id = NEW.carga_id;

  -- Get motorista name
  IF NEW.motorista_id IS NOT NULL THEN
    SELECT m.nome_completo INTO v_motorista_nome
    FROM public.motoristas m
    WHERE m.id = NEW.motorista_id;
  END IF;

  -- Map status to label (updated terminology)
  v_status_label := CASE NEW.status
    WHEN 'aguardando' THEN 'Aguardando'
    WHEN 'saiu_para_coleta' THEN 'Saiu para Coleta'
    WHEN 'saiu_para_entrega' THEN 'Saiu para Destino'
    WHEN 'entregue' THEN 'Concluída'
    WHEN 'cancelada' THEN 'Cancelada'
    ELSE NEW.status
  END;

  -- Notify transportadora users
  FOR v_empresa_usuario IN
    SELECT u.auth_user_id
    FROM public.usuarios u
    JOIN public.motoristas m ON m.empresa_id = u.empresa_id
    WHERE m.id = NEW.motorista_id
      AND u.auth_user_id IS NOT NULL
  LOOP
    INSERT INTO public.notificacoes (
      user_id, tipo, titulo, mensagem, dados, link
    ) VALUES (
      v_empresa_usuario.auth_user_id,
      'status_entrega',
      'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
      'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' teve seu status atualizado para ' || v_status_label,
      jsonb_build_object(
        'entrega_id', NEW.id,
        'carga_id', NEW.carga_id,
        'status', NEW.status,
        'codigo', COALESCE(NEW.codigo, v_carga.codigo),
        'motorista_nome', v_motorista_nome
      ),
      '/transportadora/cargas?entrega=' || NEW.id
    );
  END LOOP;

  -- Notify embarcador users
  FOR v_embarcador_usuario IN
    SELECT u.auth_user_id
    FROM public.usuarios u
    WHERE u.empresa_id = v_carga.empresa_id
      AND u.auth_user_id IS NOT NULL
  LOOP
    INSERT INTO public.notificacoes (
      user_id, tipo, titulo, mensagem, dados, link
    ) VALUES (
      v_embarcador_usuario.auth_user_id,
      'status_entrega',
      'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
      'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' teve seu status atualizado para ' || v_status_label,
      jsonb_build_object(
        'entrega_id', NEW.id,
        'carga_id', NEW.carga_id,
        'status', NEW.status,
        'codigo', COALESCE(NEW.codigo, v_carga.codigo),
        'motorista_nome', v_motorista_nome
      ),
      '/embarcador/cargas?entrega=' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Update aceitar_carga_v8 event text
CREATE OR REPLACE FUNCTION public.aceitar_carga_v8(
  p_carga_id UUID,
  p_motorista_id UUID,
  p_veiculo_id UUID,
  p_carroceria_id UUID DEFAULT NULL,
  p_peso_kg NUMERIC DEFAULT NULL,
  p_valor_frete NUMERIC DEFAULT NULL,
  p_previsao_coleta TIMESTAMPTZ DEFAULT NULL,
  p_viagem_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT 'Sistema',
  p_carrocerias_alocadas JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_carga RECORD;
  v_caller_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_novo_peso_disponivel NUMERIC;
  v_novo_status status_carga;
  v_entrega_id UUID;
  v_entrega_codigo TEXT;
  v_viagem_id UUID;
  v_viagem_criada BOOLEAN := FALSE;
  v_viagem_status TEXT;
  v_nova_ordem INT;
BEGIN
  v_caller_id := auth.uid();

  -- ETAPA 1: Buscar carga
  SELECT id, peso_kg, peso_disponivel_kg, status, permite_fracionado
  INTO v_carga
  FROM cargas
  WHERE id = p_carga_id
  FOR UPDATE;

  IF v_carga IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Oferta não encontrada');
  END IF;

  IF v_carga.status NOT IN ('publicada', 'parcialmente_aceita') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Oferta não está disponível para aceite');
  END IF;

  -- ETAPA 2: Peso
  IF p_peso_kg IS NULL THEN
    p_peso_kg := v_carga.peso_disponivel_kg;
  END IF;

  IF p_peso_kg > v_carga.peso_disponivel_kg THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Peso solicitado excede o disponível');
  END IF;

  v_novo_peso_disponivel := v_carga.peso_disponivel_kg - p_peso_kg;

  IF v_novo_peso_disponivel <= 0 OR NOT COALESCE(v_carga.permite_fracionado, TRUE) THEN
    v_novo_status := 'aceita';
    v_novo_peso_disponivel := 0;
  ELSE
    v_novo_status := 'parcialmente_aceita';
  END IF;

  UPDATE cargas SET
    peso_disponivel_kg = v_novo_peso_disponivel,
    status = v_novo_status,
    updated_at = v_now
  WHERE id = p_carga_id;

  -- ETAPA 3: Criar registro na tabela entregas
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
  VALUES (v_entrega_id, 'criado', v_now, 'Carga criada', v_caller_id, p_user_name);

  INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_id, user_nome)
  VALUES (v_entrega_id, 'aceite', v_now + INTERVAL '1 millisecond', 'Status inicial definido automaticamente', NULL, 'Sistema');

  -- ETAPA 5: Viagem
  IF p_viagem_id IS NOT NULL THEN
    SELECT status INTO v_viagem_status FROM viagens WHERE id = p_viagem_id FOR UPDATE;
    IF v_viagem_status IS NULL THEN
      p_viagem_id := NULL;
    ELSIF v_viagem_status NOT IN ('planejada', 'em_andamento') THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Viagem não está ativa');
    END IF;
  END IF;

  IF p_viagem_id IS NULL THEN
    INSERT INTO viagens (motorista_id, status, created_at)
    VALUES (p_motorista_id, 'planejada', v_now)
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

  RETURN jsonb_build_object(
    'success', TRUE,
    'entrega_id', v_entrega_id,
    'entrega_codigo', v_entrega_codigo,
    'viagem_id', v_viagem_id,
    'viagem_criada', v_viagem_criada,
    'novo_status_carga', v_novo_status::text,
    'peso_disponivel', v_novo_peso_disponivel
  );
END;
$function$;
