
-- 1. Adicionar coluna fatura_motorista_id em financeiro_entregas
ALTER TABLE public.financeiro_entregas 
  ADD COLUMN IF NOT EXISTS fatura_motorista_id uuid REFERENCES public.faturas_motoristas(id);

-- 2. Função trigger para vincular fatura de motorista autônomo automaticamente
CREATE OR REPLACE FUNCTION public.vincular_fatura_motorista_automatica()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_motorista_id uuid;
  v_tipo_cadastro text;
  v_data date;
  v_quinzena smallint;
  v_mes smallint;
  v_ano smallint;
  v_periodo_inicio date;
  v_periodo_fim date;
  v_last_day integer;
  v_fatura_id uuid;
BEGIN
  -- Buscar motorista da entrega
  SELECT e.motorista_id INTO v_motorista_id
  FROM entregas e WHERE e.id = NEW.entrega_id;

  IF v_motorista_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verificar se é autônomo
  SELECT m.tipo_cadastro::text INTO v_tipo_cadastro
  FROM motoristas m WHERE m.id = v_motorista_id;

  IF v_tipo_cadastro != 'autonomo' THEN
    RETURN NEW;
  END IF;

  -- Calcular período quinzenal
  v_data := COALESCE(NEW.created_at::date, CURRENT_DATE);
  v_mes := EXTRACT(MONTH FROM v_data)::smallint;
  v_ano := EXTRACT(YEAR FROM v_data)::smallint;

  IF EXTRACT(DAY FROM v_data) <= 15 THEN
    v_quinzena := 1;
    v_periodo_inicio := make_date(v_ano, v_mes, 1);
    v_periodo_fim := make_date(v_ano, v_mes, 15);
  ELSE
    v_quinzena := 2;
    v_periodo_inicio := make_date(v_ano, v_mes, 16);
    v_last_day := EXTRACT(DAY FROM (make_date(v_ano, v_mes, 1) + INTERVAL '1 month' - INTERVAL '1 day'))::integer;
    v_periodo_fim := make_date(v_ano, v_mes, v_last_day);
  END IF;

  -- Criar ou buscar fatura do motorista
  INSERT INTO faturas_motoristas (motorista_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
  VALUES (v_motorista_id, 'a_pagar', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
  ON CONFLICT (motorista_id, ano, mes, quinzena) DO NOTHING;

  SELECT id INTO v_fatura_id FROM faturas_motoristas
  WHERE motorista_id = v_motorista_id AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;

  NEW.fatura_motorista_id := v_fatura_id;

  RETURN NEW;
END;
$$;

-- 3. Trigger BEFORE INSERT em financeiro_entregas
CREATE TRIGGER vincular_fatura_motorista_trigger
  BEFORE INSERT ON public.financeiro_entregas
  FOR EACH ROW EXECUTE FUNCTION vincular_fatura_motorista_automatica();

-- 4. Função para recalcular totais da fatura do motorista
CREATE OR REPLACE FUNCTION public.recalcular_fatura_motorista()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Recalcular fatura do motorista
  IF NEW.fatura_motorista_id IS NOT NULL THEN
    UPDATE faturas_motoristas SET
      valor_bruto = sub.total_bruto,
      valor_comissao = sub.total_comissao,
      valor_liquido = sub.total_liquido,
      qtd_entregas = sub.qtd,
      updated_at = now()
    FROM (
      SELECT
        COALESCE(SUM(valor_frete), 0) as total_bruto,
        COALESCE(SUM(valor_comissao), 0) as total_comissao,
        COALESCE(SUM(valor_liquido), 0) as total_liquido,
        COUNT(*) as qtd
      FROM financeiro_entregas
      WHERE fatura_motorista_id = NEW.fatura_motorista_id
    ) sub
    WHERE id = NEW.fatura_motorista_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Trigger AFTER INSERT/UPDATE para recalcular
CREATE TRIGGER recalcular_fatura_motorista_trigger
  AFTER INSERT OR UPDATE ON public.financeiro_entregas
  FOR EACH ROW EXECUTE FUNCTION recalcular_fatura_motorista();

-- 6. Backfill: popular faturas_motoristas com dados existentes de autônomos
DO $$
DECLARE
  r RECORD;
  v_data date;
  v_quinzena smallint;
  v_mes smallint;
  v_ano smallint;
  v_periodo_inicio date;
  v_periodo_fim date;
  v_last_day integer;
  v_fatura_id uuid;
BEGIN
  FOR r IN
    SELECT fe.id as fe_id, fe.created_at, e.motorista_id, fe.valor_frete, fe.valor_comissao, fe.valor_liquido
    FROM financeiro_entregas fe
    JOIN entregas e ON e.id = fe.entrega_id
    JOIN motoristas m ON m.id = e.motorista_id
    WHERE m.tipo_cadastro = 'autonomo'
      AND fe.fatura_motorista_id IS NULL
  LOOP
    v_data := COALESCE(r.created_at::date, CURRENT_DATE);
    v_mes := EXTRACT(MONTH FROM v_data)::smallint;
    v_ano := EXTRACT(YEAR FROM v_data)::smallint;

    IF EXTRACT(DAY FROM v_data) <= 15 THEN
      v_quinzena := 1;
      v_periodo_inicio := make_date(v_ano, v_mes, 1);
      v_periodo_fim := make_date(v_ano, v_mes, 15);
    ELSE
      v_quinzena := 2;
      v_periodo_inicio := make_date(v_ano, v_mes, 16);
      v_last_day := EXTRACT(DAY FROM (make_date(v_ano, v_mes, 1) + INTERVAL '1 month' - INTERVAL '1 day'))::integer;
      v_periodo_fim := make_date(v_ano, v_mes, v_last_day);
    END IF;

    INSERT INTO faturas_motoristas (motorista_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
    VALUES (r.motorista_id, 'a_pagar', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
    ON CONFLICT (motorista_id, ano, mes, quinzena) DO NOTHING;

    SELECT id INTO v_fatura_id FROM faturas_motoristas
    WHERE motorista_id = r.motorista_id AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;

    UPDATE financeiro_entregas SET fatura_motorista_id = v_fatura_id WHERE id = r.fe_id;
  END LOOP;

  -- Recalcular totais de todas as faturas criadas
  UPDATE faturas_motoristas fm SET
    valor_bruto = sub.total_bruto,
    valor_comissao = sub.total_comissao,
    valor_liquido = sub.total_liquido,
    qtd_entregas = sub.qtd,
    updated_at = now()
  FROM (
    SELECT
      fatura_motorista_id,
      COALESCE(SUM(valor_frete), 0) as total_bruto,
      COALESCE(SUM(valor_comissao), 0) as total_comissao,
      COALESCE(SUM(valor_liquido), 0) as total_liquido,
      COUNT(*) as qtd
    FROM financeiro_entregas
    WHERE fatura_motorista_id IS NOT NULL
    GROUP BY fatura_motorista_id
  ) sub
  WHERE fm.id = sub.fatura_motorista_id;
END;
$$;
