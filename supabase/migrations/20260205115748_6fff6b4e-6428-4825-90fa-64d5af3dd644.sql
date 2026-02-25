-- =====================================================
-- FUNÇÃO RPC: finalizar_entrega_e_verificar_viagem
-- Atualiza entrega para 'entregue' e auto-finaliza viagem
-- se todas entregas estiverem concluídas
-- =====================================================

CREATE OR REPLACE FUNCTION public.finalizar_entrega_e_verificar_viagem(
  p_entrega_id UUID,
  p_nome_recebedor TEXT DEFAULT NULL,
  p_documento_recebedor TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entrega RECORD;
  v_viagem_id UUID;
  v_viagem_finalizada BOOLEAN := FALSE;
  v_todas_entregues BOOLEAN;
  v_total_entregas INT;
  v_entregas_concluidas INT;
BEGIN
  -- =====================================================
  -- ETAPA 1: Lock e validação da entrega
  -- =====================================================
  
  SELECT id, status, motorista_id
  INTO v_entrega
  FROM entregas
  WHERE id = p_entrega_id
  FOR UPDATE;
  
  IF v_entrega.id IS NULL THEN
    RAISE EXCEPTION 'ENTREGA_NAO_ENCONTRADA';
  END IF;
  
  IF v_entrega.status = 'entregue' THEN
    RAISE EXCEPTION 'ENTREGA_JA_FINALIZADA';
  END IF;
  
  IF v_entrega.status = 'cancelada' THEN
    RAISE EXCEPTION 'ENTREGA_CANCELADA';
  END IF;
  
  -- =====================================================
  -- ETAPA 2: Atualizar entrega para 'entregue'
  -- =====================================================
  
  UPDATE entregas
  SET 
    status = 'entregue',
    entregue_em = NOW(),
    nome_recebedor = COALESCE(p_nome_recebedor, nome_recebedor),
    documento_recebedor = COALESCE(p_documento_recebedor, documento_recebedor),
    observacoes = COALESCE(p_observacoes, observacoes),
    updated_at = NOW()
  WHERE id = p_entrega_id;
  
  -- =====================================================
  -- ETAPA 3: Buscar viagem associada (se existir)
  -- =====================================================
  
  SELECT ve.viagem_id
  INTO v_viagem_id
  FROM viagem_entregas ve
  WHERE ve.entrega_id = p_entrega_id
  LIMIT 1;
  
  -- Se não tem viagem associada, retorna sucesso
  IF v_viagem_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'entrega_id', p_entrega_id,
      'entrega_status', 'entregue',
      'viagem_id', NULL,
      'viagem_finalizada', FALSE,
      'mensagem', 'Entrega finalizada sem viagem associada'
    );
  END IF;
  
  -- =====================================================
  -- ETAPA 4: Lock na viagem para evitar race condition
  -- =====================================================
  
  PERFORM id FROM viagens WHERE id = v_viagem_id FOR UPDATE;
  
  -- =====================================================
  -- ETAPA 5: Verificar se TODAS entregas da viagem estão entregues
  -- Usando NOT EXISTS para performance
  -- =====================================================
  
  SELECT 
    NOT EXISTS (
      SELECT 1
      FROM viagem_entregas ve
      JOIN entregas e ON e.id = ve.entrega_id
      WHERE ve.viagem_id = v_viagem_id
        AND e.status != 'entregue'
        AND e.status != 'cancelada'
    )
  INTO v_todas_entregues;
  
  -- Contar para retorno informativo
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE e.status IN ('entregue', 'cancelada'))
  INTO v_total_entregas, v_entregas_concluidas
  FROM viagem_entregas ve
  JOIN entregas e ON e.id = ve.entrega_id
  WHERE ve.viagem_id = v_viagem_id;
  
  -- =====================================================
  -- ETAPA 6: Finalizar viagem se todas entregas concluídas
  -- =====================================================
  
  IF v_todas_entregues THEN
    UPDATE viagens
    SET 
      status = 'finalizada',
      fim_em = NOW(),
      ended_at = NOW(),
      updated_at = NOW()
    WHERE id = v_viagem_id
      AND status != 'finalizada';
    
    v_viagem_finalizada := FOUND;
  END IF;
  
  -- =====================================================
  -- RETORNO: JSON estruturado com resultado
  -- =====================================================
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'entrega_id', p_entrega_id,
    'entrega_status', 'entregue',
    'viagem_id', v_viagem_id,
    'viagem_finalizada', v_viagem_finalizada,
    'total_entregas', v_total_entregas,
    'entregas_concluidas', v_entregas_concluidas,
    'mensagem', CASE 
      WHEN v_viagem_finalizada THEN 'Entrega e viagem finalizadas com sucesso'
      ELSE 'Entrega finalizada. Viagem ainda possui entregas pendentes'
    END
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- =====================================================
-- TRIGGER DE PROTEÇÃO: Impedir viagem finalizada com entregas pendentes
-- (Leve, apenas validação, sem lógica pesada)
-- =====================================================

CREATE OR REPLACE FUNCTION public.proteger_finalizacao_viagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entregas_pendentes INT;
BEGIN
  -- Só validar quando status muda para 'finalizada'
  IF NEW.status = 'finalizada' AND (OLD.status IS NULL OR OLD.status != 'finalizada') THEN
    SELECT COUNT(*)
    INTO v_entregas_pendentes
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status NOT IN ('entregue', 'cancelada');
    
    IF v_entregas_pendentes > 0 THEN
      RAISE EXCEPTION 'VIAGEM_COM_ENTREGAS_PENDENTES: % entrega(s) ainda não finalizada(s)', v_entregas_pendentes;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger de proteção (drop if exists para idempotência)
DROP TRIGGER IF EXISTS trg_proteger_finalizacao_viagem ON viagens;

CREATE TRIGGER trg_proteger_finalizacao_viagem
  BEFORE UPDATE ON viagens
  FOR EACH ROW
  EXECUTE FUNCTION proteger_finalizacao_viagem();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.finalizar_entrega_e_verificar_viagem IS 
'RPC atômica para finalizar entrega e auto-finalizar viagem quando todas entregas estiverem concluídas. 
Usa FOR UPDATE para evitar race conditions. Deve ser chamada via Edge Function.';

COMMENT ON FUNCTION public.proteger_finalizacao_viagem IS 
'Trigger de proteção leve que impede viagem ser finalizada se existirem entregas pendentes. 
Apenas validação, sem lógica de negócio pesada.';