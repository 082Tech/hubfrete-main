-- Backfill: create faturas and link existing financeiro_entregas records
-- This handles records created before the vincular_fatura_automatica trigger existed

DO $$
DECLARE
  rec RECORD;
  v_data DATE;
  v_quinzena SMALLINT;
  v_mes SMALLINT;
  v_ano SMALLINT;
  v_periodo_inicio DATE;
  v_periodo_fim DATE;
  v_last_day INTEGER;
  v_fatura_emb_id UUID;
  v_fatura_trans_id UUID;
BEGIN
  FOR rec IN 
    SELECT * FROM financeiro_entregas 
    WHERE fatura_embarcador_id IS NULL OR fatura_transportadora_id IS NULL
  LOOP
    v_data := COALESCE(rec.data_pagamento, rec.created_at::date);
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

    -- Fatura embarcador
    v_fatura_emb_id := NULL;
    IF rec.empresa_embarcadora_id IS NOT NULL THEN
      INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
      VALUES (rec.empresa_embarcadora_id, 'a_receber', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
      ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;

      SELECT id INTO v_fatura_emb_id FROM faturas
      WHERE empresa_id = rec.empresa_embarcadora_id AND tipo = 'a_receber'
        AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;
    END IF;

    -- Fatura transportadora
    v_fatura_trans_id := NULL;
    IF rec.empresa_transportadora_id IS NOT NULL THEN
      INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
      VALUES (rec.empresa_transportadora_id, 'a_pagar', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
      ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;

      SELECT id INTO v_fatura_trans_id FROM faturas
      WHERE empresa_id = rec.empresa_transportadora_id AND tipo = 'a_pagar'
        AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;
    END IF;

    -- Update the financeiro_entregas record
    UPDATE financeiro_entregas SET
      fatura_embarcador_id = COALESCE(v_fatura_emb_id, fatura_embarcador_id),
      fatura_transportadora_id = COALESCE(v_fatura_trans_id, fatura_transportadora_id)
    WHERE id = rec.id;
  END LOOP;
END $$;

-- Now recalculate all fatura totals
UPDATE faturas f SET
  valor_bruto = sub.total_bruto,
  valor_comissao = sub.total_comissao,
  valor_liquido = sub.total_liquido,
  qtd_entregas = sub.qtd,
  updated_at = now()
FROM (
  SELECT 
    fatura_embarcador_id as fatura_id,
    COALESCE(SUM(valor_frete), 0) as total_bruto,
    COALESCE(SUM(valor_comissao), 0) as total_comissao,
    COALESCE(SUM(valor_liquido), 0) as total_liquido,
    COUNT(*) as qtd
  FROM financeiro_entregas
  WHERE fatura_embarcador_id IS NOT NULL
  GROUP BY fatura_embarcador_id
) sub
WHERE f.id = sub.fatura_id;

UPDATE faturas f SET
  valor_bruto = sub.total_bruto,
  valor_comissao = sub.total_comissao,
  valor_liquido = sub.total_liquido,
  qtd_entregas = sub.qtd,
  updated_at = now()
FROM (
  SELECT 
    fatura_transportadora_id as fatura_id,
    COALESCE(SUM(valor_frete), 0) as total_bruto,
    COALESCE(SUM(valor_comissao), 0) as total_comissao,
    COALESCE(SUM(valor_liquido), 0) as total_liquido,
    COUNT(*) as qtd
  FROM financeiro_entregas
  WHERE fatura_transportadora_id IS NOT NULL
  GROUP BY fatura_transportadora_id
) sub
WHERE f.id = sub.fatura_id;