
-- ============================================
-- Convert faturas.tipo (text → tipo_fatura enum)
-- Convert faturas.status (text → status_fatura enum)
-- ============================================

-- 1. Drop dependent objects
DROP TRIGGER IF EXISTS trg_validar_fatura ON public.faturas;
ALTER TABLE public.faturas DROP CONSTRAINT IF EXISTS faturas_tipo_check;
ALTER TABLE public.faturas DROP CONSTRAINT IF EXISTS faturas_empresa_tipo_periodo_unique;

-- 2. Convert tipo column: text → tipo_fatura enum
ALTER TABLE public.faturas 
  ALTER COLUMN tipo TYPE public.tipo_fatura USING tipo::public.tipo_fatura;

-- 3. Convert status column: text → status_fatura enum
ALTER TABLE public.faturas 
  ALTER COLUMN status SET DEFAULT 'aberta'::public.status_fatura;
ALTER TABLE public.faturas 
  ALTER COLUMN status TYPE public.status_fatura USING status::public.status_fatura;

-- 4. Recreate unique constraint with enum column
ALTER TABLE public.faturas 
  ADD CONSTRAINT faturas_empresa_tipo_periodo_unique 
  UNIQUE (empresa_id, tipo, ano, mes, quinzena);

-- 5. Recreate validation trigger (unchanged logic)
CREATE OR REPLACE FUNCTION public.validar_fatura()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quinzena NOT IN (1, 2) THEN RAISE EXCEPTION 'quinzena deve ser 1 ou 2'; END IF;
  IF NEW.mes < 1 OR NEW.mes > 12 THEN RAISE EXCEPTION 'mes deve estar entre 1 e 12'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_fatura
  BEFORE INSERT OR UPDATE ON public.faturas
  FOR EACH ROW EXECUTE FUNCTION public.validar_fatura();

-- 6. Update vincular_fatura_automatica to use enum literals
CREATE OR REPLACE FUNCTION public.vincular_fatura_automatica()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
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
    INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
    VALUES (NEW.empresa_embarcadora_id, 'a_receber'::tipo_fatura, v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
    ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;
    SELECT id INTO v_fatura_emb_id FROM faturas
    WHERE empresa_id = NEW.empresa_embarcadora_id AND tipo = 'a_receber'::tipo_fatura AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;
    NEW.fatura_embarcador_id := v_fatura_emb_id;
  END IF;
  IF NEW.empresa_transportadora_id IS NOT NULL THEN
    INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
    VALUES (NEW.empresa_transportadora_id, 'a_pagar'::tipo_fatura, v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
    ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;
    SELECT id INTO v_fatura_trans_id FROM faturas
    WHERE empresa_id = NEW.empresa_transportadora_id AND tipo = 'a_pagar'::tipo_fatura AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;
    NEW.fatura_transportadora_id := v_fatura_trans_id;
  END IF;
  RETURN NEW;
END;
$$;
