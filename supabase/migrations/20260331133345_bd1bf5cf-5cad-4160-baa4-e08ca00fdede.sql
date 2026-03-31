-- 1) Update criar_financeiro_entrega to increment credito_utilizado on the embarcador
CREATE OR REPLACE FUNCTION public.criar_financeiro_entrega()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_embarcador_empresa_id INTEGER;
  v_transportadora_empresa_id INTEGER;
  v_motorista_id UUID;
  v_tipo_cadastro TEXT;
  v_comissao_percent NUMERIC;
  v_valor_frete NUMERIC;
  v_valor_comissao NUMERIC;
  v_valor_liquido NUMERIC;
  v_data_vencimento TIMESTAMPTZ;
  v_prazo_dias INTEGER;
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status != 'entregue') THEN
    IF EXISTS (SELECT 1 FROM financeiro_entregas WHERE entrega_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT c.empresa_id INTO v_embarcador_empresa_id FROM cargas c WHERE c.id = NEW.carga_id;
    SELECT m.empresa_id, m.id, m.tipo_cadastro::text
      INTO v_transportadora_empresa_id, v_motorista_id, v_tipo_cadastro
      FROM motoristas m WHERE m.id = NEW.motorista_id;

    SELECT COALESCE(e.comissao_hubfrete_percent, 0) INTO v_comissao_percent
    FROM empresas e WHERE e.id = v_embarcador_empresa_id;

    SELECT COALESCE(ecf.prazo_dias, 30) INTO v_prazo_dias
    FROM empresa_config_financeira ecf
    WHERE ecf.empresa_id = v_embarcador_empresa_id;

    IF v_prazo_dias IS NULL THEN
      v_prazo_dias := 30;
    END IF;

    v_valor_frete := COALESCE(NEW.valor_frete, 0);
    v_valor_comissao := ROUND(v_valor_frete * v_comissao_percent / 100, 2);
    v_valor_liquido := v_valor_frete - v_valor_comissao;

    v_data_vencimento := COALESCE(NEW.entregue_em, NOW()) + (v_prazo_dias || ' days')::interval;

    INSERT INTO financeiro_entregas (
      entrega_id, empresa_transportadora_id, empresa_embarcadora_id,
      valor_frete, valor_comissao, valor_liquido,
      data_vencimento, motorista_id,
      tipo_beneficiario
    ) VALUES (
      NEW.id, v_transportadora_empresa_id, v_embarcador_empresa_id,
      v_valor_frete, v_valor_comissao, v_valor_liquido,
      v_data_vencimento, v_motorista_id,
      CASE WHEN v_tipo_cadastro = 'autonomo' THEN 'autonomo' ELSE 'transportadora' END
    );

    -- Increment credito_utilizado on the embarcador financial config
    UPDATE empresa_config_financeira
    SET credito_utilizado = credito_utilizado + v_valor_frete,
        updated_at = NOW()
    WHERE empresa_id = v_embarcador_empresa_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Create trigger to decrement credito_utilizado when a fatura is paid (baixa)
CREATE OR REPLACE FUNCTION public.ajustar_credito_na_baixa()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only act when status changes TO 'pago' from something else
  IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') THEN
    IF NEW.empresa_embarcadora_id IS NOT NULL THEN
      UPDATE empresa_config_financeira
      SET credito_utilizado = GREATEST(0, credito_utilizado - COALESCE(NEW.valor_frete, 0)),
          updated_at = NOW()
      WHERE empresa_id = NEW.empresa_embarcadora_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Attach the trigger to financeiro_entregas
DROP TRIGGER IF EXISTS trg_ajustar_credito_na_baixa ON financeiro_entregas;
CREATE TRIGGER trg_ajustar_credito_na_baixa
  AFTER UPDATE ON financeiro_entregas
  FOR EACH ROW
  EXECUTE FUNCTION ajustar_credito_na_baixa();