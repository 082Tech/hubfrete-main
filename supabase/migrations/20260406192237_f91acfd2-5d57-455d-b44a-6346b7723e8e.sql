
CREATE OR REPLACE FUNCTION public.cancelar_viagem_completa(p_viagem_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viagem RECORD;
  v_entregas_canceladas integer := 0;
  v_entregas_peso_restaurado integer := 0;
  v_entrega RECORD;
BEGIN
  -- 1. Buscar viagem e validar status
  SELECT id, codigo, status INTO v_viagem
  FROM viagens
  WHERE id = p_viagem_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VIAGEM_NAO_ENCONTRADA: Viagem % não existe', p_viagem_id;
  END IF;

  IF v_viagem.status = 'cancelada' THEN
    RAISE EXCEPTION 'VIAGEM_JA_CANCELADA: Viagem % já está cancelada', v_viagem.codigo;
  END IF;

  IF v_viagem.status = 'finalizada' THEN
    RAISE EXCEPTION 'VIAGEM_JA_FINALIZADA: Viagem % já está finalizada e não pode ser cancelada', v_viagem.codigo;
  END IF;

  -- 2. Para entregas já entregues, restaurar peso na carga
  FOR v_entrega IN
    SELECT e.id, e.peso_alocado_kg, e.carga_id
    FROM entregas e
    INNER JOIN viagem_entregas ve ON ve.entrega_id = e.id
    WHERE ve.viagem_id = p_viagem_id
      AND e.status = 'entregue'
      AND e.peso_alocado_kg IS NOT NULL
      AND e.peso_alocado_kg > 0
  LOOP
    UPDATE cargas
    SET peso_disponivel_kg = COALESCE(peso_disponivel_kg, 0) + v_entrega.peso_alocado_kg,
        updated_at = now()
    WHERE id = v_entrega.carga_id;

    v_entregas_peso_restaurado := v_entregas_peso_restaurado + 1;
  END LOOP;

  -- 3. Cancelar entregas ativas (não entregue, não cancelada)
  WITH cancelled AS (
    UPDATE entregas
    SET status = 'cancelada', updated_at = now()
    WHERE id IN (
      SELECT e.id
      FROM entregas e
      INNER JOIN viagem_entregas ve ON ve.entrega_id = e.id
      WHERE ve.viagem_id = p_viagem_id
        AND e.status NOT IN ('entregue', 'cancelada')
    )
    RETURNING id
  )
  SELECT count(*) INTO v_entregas_canceladas FROM cancelled;

  -- 4. Cancelar a viagem
  UPDATE viagens
  SET status = 'cancelada', updated_at = now()
  WHERE id = p_viagem_id;

  -- 5. Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'viagem_id', p_viagem_id,
    'viagem_codigo', v_viagem.codigo,
    'entregas_canceladas', v_entregas_canceladas,
    'entregas_peso_restaurado', v_entregas_peso_restaurado,
    'mensagem', format('Viagem %s cancelada com sucesso. %s entregas canceladas, %s com peso restaurado.',
      v_viagem.codigo, v_entregas_canceladas, v_entregas_peso_restaurado)
  );
END;
$$;
