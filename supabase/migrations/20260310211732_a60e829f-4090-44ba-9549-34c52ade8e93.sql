
-- Function: criar_financeiro_entrega
CREATE OR REPLACE FUNCTION public.criar_financeiro_entrega()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_embarcador_empresa_id INTEGER;
  v_transportadora_empresa_id INTEGER;
  v_comissao_percent NUMERIC;
  v_valor_frete NUMERIC;
  v_valor_comissao NUMERIC;
  v_valor_liquido NUMERIC;
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status != 'entregue') THEN
    IF EXISTS (SELECT 1 FROM financeiro_entregas WHERE entrega_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    SELECT c.empresa_id INTO v_embarcador_empresa_id FROM cargas c WHERE c.id = NEW.carga_id;
    SELECT m.empresa_id INTO v_transportadora_empresa_id FROM motoristas m WHERE m.id = NEW.motorista_id;
    SELECT COALESCE(e.comissao_hubfrete_percent, 10) INTO v_comissao_percent FROM empresas e WHERE e.id = v_embarcador_empresa_id;
    v_valor_frete := COALESCE(NEW.valor_frete, 0);
    v_valor_comissao := ROUND(v_valor_frete * v_comissao_percent / 100, 2);
    v_valor_liquido := v_valor_frete - v_valor_comissao;
    INSERT INTO financeiro_entregas (entrega_id, empresa_transportadora_id, empresa_embarcadora_id, valor_frete, valor_comissao, valor_liquido)
    VALUES (NEW.id, v_transportadora_empresa_id, v_embarcador_empresa_id, v_valor_frete, v_valor_comissao, v_valor_liquido);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_criar_financeiro_entrega ON public.entregas;
CREATE TRIGGER trg_criar_financeiro_entrega AFTER UPDATE ON public.entregas FOR EACH ROW EXECUTE FUNCTION public.criar_financeiro_entrega();

-- Function: vincular_fatura_automatica
CREATE OR REPLACE FUNCTION public.vincular_fatura_automatica()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_data date;
  v_quinzena smallint;
  v_mes smallint;
  v_ano smallint;
  v_periodo_inicio date;
  v_periodo_fim date;
  v_fatura_emb_id uuid;
  v_fatura_trans_id uuid;
  v_last_day integer;
BEGIN
  v_data := COALESCE(NEW.data_pagamento, NEW.created_at::date);
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
  IF NEW.empresa_embarcadora_id IS NOT NULL THEN
    INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim) VALUES (NEW.empresa_embarcadora_id, 'a_receber', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim) ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;
    SELECT id INTO v_fatura_emb_id FROM faturas WHERE empresa_id = NEW.empresa_embarcadora_id AND tipo = 'a_receber' AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;
    NEW.fatura_embarcador_id := v_fatura_emb_id;
  END IF;
  IF NEW.empresa_transportadora_id IS NOT NULL THEN
    INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim) VALUES (NEW.empresa_transportadora_id, 'a_pagar', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim) ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;
    SELECT id INTO v_fatura_trans_id FROM faturas WHERE empresa_id = NEW.empresa_transportadora_id AND tipo = 'a_pagar' AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;
    NEW.fatura_transportadora_id := v_fatura_trans_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_vincular_fatura ON public.financeiro_entregas;
CREATE TRIGGER trg_vincular_fatura BEFORE INSERT ON public.financeiro_entregas FOR EACH ROW EXECUTE FUNCTION public.vincular_fatura_automatica();

-- Function: recalcular_fatura
CREATE OR REPLACE FUNCTION public.recalcular_fatura()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.fatura_embarcador_id IS NOT NULL THEN
    UPDATE faturas SET valor_bruto = sub.total_bruto, valor_comissao = sub.total_comissao, valor_liquido = sub.total_liquido, qtd_entregas = sub.qtd, updated_at = now()
    FROM (SELECT COALESCE(SUM(valor_frete), 0) as total_bruto, COALESCE(SUM(valor_comissao), 0) as total_comissao, COALESCE(SUM(valor_liquido), 0) as total_liquido, COUNT(*) as qtd FROM financeiro_entregas WHERE fatura_embarcador_id = NEW.fatura_embarcador_id) sub
    WHERE id = NEW.fatura_embarcador_id;
  END IF;
  IF NEW.fatura_transportadora_id IS NOT NULL THEN
    UPDATE faturas SET valor_bruto = sub.total_bruto, valor_comissao = sub.total_comissao, valor_liquido = sub.total_liquido, qtd_entregas = sub.qtd, updated_at = now()
    FROM (SELECT COALESCE(SUM(valor_frete), 0) as total_bruto, COALESCE(SUM(valor_comissao), 0) as total_comissao, COALESCE(SUM(valor_liquido), 0) as total_liquido, COUNT(*) as qtd FROM financeiro_entregas WHERE fatura_transportadora_id = NEW.fatura_transportadora_id) sub
    WHERE id = NEW.fatura_transportadora_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_recalcular_fatura ON public.financeiro_entregas;
CREATE TRIGGER trg_recalcular_fatura AFTER INSERT OR UPDATE ON public.financeiro_entregas FOR EACH ROW EXECUTE FUNCTION public.recalcular_fatura();

-- Function: validar_fatura
CREATE OR REPLACE FUNCTION public.validar_fatura()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.quinzena NOT IN (1, 2) THEN RAISE EXCEPTION 'quinzena deve ser 1 ou 2'; END IF;
  IF NEW.mes < 1 OR NEW.mes > 12 THEN RAISE EXCEPTION 'mes deve estar entre 1 e 12'; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_fatura ON public.faturas;
CREATE TRIGGER trg_validar_fatura BEFORE INSERT OR UPDATE ON public.faturas FOR EACH ROW EXECUTE FUNCTION public.validar_fatura();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
