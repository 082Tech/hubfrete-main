# 🔄 Plano de Migração DEV → PRODUÇÃO (v2)

**Período**: 05/03/2026 – 10/03/2026  
**Gerado em**: 10/03/2026  
**Ambiente DEV**: `ublyithvarvtqbwmxtyh` (hubfrete)  
**Ambiente PROD**: `eilwdavgnuhfyxfqkvrk` (hubfrete-prod)

> ⚠️ Executar os SQLs abaixo **no banco de PRODUÇÃO** na ordem apresentada.  
> Este plano cobre APENAS as alterações posteriores ao plano anterior (05/03/2026).

---

## 📋 Resumo das Alterações

| Categoria | Qtd |
|---|---|
| Novas colunas em tabelas existentes | 2 |
| Alteração de coluna (constraint) | 1 |
| Novo valor em ENUM | 1 |
| Functions (CREATE/REPLACE) | 4 |
| Triggers novos | 3 |
| Backfill de dados | 2 |

---

## 1️⃣ ENUM — Novo valor 'em_transito' em status_entrega

```sql
ALTER TYPE public.status_entrega ADD VALUE IF NOT EXISTS 'em_transito' AFTER 'saiu_para_coleta';
```

---

## 2️⃣ COLUNAS — Novas

```sql
-- cargas: número do pedido do embarcador
ALTER TABLE public.cargas ADD COLUMN IF NOT EXISTS numero_pedido TEXT DEFAULT NULL;

-- empresas: comissão HubFrete (se não existir da migração anterior)
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS comissao_hubfrete_percent NUMERIC(5,2) DEFAULT 0;

COMMENT ON COLUMN public.empresas.comissao_hubfrete_percent
  IS 'Percentual de comissão HubFrete sobre fretes de cargas deste embarcador (0-100)';
```

---

## 3️⃣ COLUNA — Padronizar comissão (NOT NULL DEFAULT 10)

> ⚠️ Este passo atualiza TODAS as empresas com comissão 0 ou NULL para 10%. Verificar se há empresas que devem ter comissão diferente antes de executar.

```sql
-- Preencher registros existentes
UPDATE empresas SET comissao_hubfrete_percent = 10
WHERE comissao_hubfrete_percent IS NULL OR comissao_hubfrete_percent = 0;

-- Tornar NOT NULL com default 10
ALTER TABLE empresas ALTER COLUMN comissao_hubfrete_percent SET DEFAULT 10;
ALTER TABLE empresas ALTER COLUMN comissao_hubfrete_percent SET NOT NULL;
```

---

## 4️⃣ FUNCTION — criar_financeiro_entrega (trigger ao finalizar entrega)

> Cria automaticamente o registro em `financeiro_entregas` quando uma entrega muda para status `'entregue'`.

```sql
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

    SELECT COALESCE(e.comissao_hubfrete_percent, 10) INTO v_comissao_percent
    FROM empresas e WHERE e.id = v_embarcador_empresa_id;

    v_valor_frete := COALESCE(NEW.valor_frete, 0);
    v_valor_comissao := ROUND(v_valor_frete * v_comissao_percent / 100, 2);
    v_valor_liquido := v_valor_frete - v_valor_comissao;

    INSERT INTO financeiro_entregas (
      entrega_id, empresa_transportadora_id, empresa_embarcadora_id,
      valor_frete, valor_comissao, valor_liquido
    ) VALUES (
      NEW.id, v_transportadora_empresa_id, v_embarcador_empresa_id,
      v_valor_frete, v_valor_comissao, v_valor_liquido
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Criar trigger (se não existir)
DROP TRIGGER IF EXISTS trg_criar_financeiro_entrega ON public.entregas;
CREATE TRIGGER trg_criar_financeiro_entrega
  AFTER UPDATE ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_financeiro_entrega();
```

---

## 5️⃣ FUNCTION — vincular_fatura_automatica (trigger BEFORE INSERT em financeiro_entregas)

> Vincula automaticamente o registro financeiro à fatura quinzenal correspondente (cria a fatura se não existir).

```sql
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

  -- Fatura do embarcador (a_receber)
  IF NEW.empresa_embarcadora_id IS NOT NULL THEN
    INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
    VALUES (NEW.empresa_embarcadora_id, 'a_receber', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
    ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;

    SELECT id INTO v_fatura_emb_id FROM faturas
    WHERE empresa_id = NEW.empresa_embarcadora_id AND tipo = 'a_receber'
      AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;

    NEW.fatura_embarcador_id := v_fatura_emb_id;
  END IF;

  -- Fatura da transportadora (a_pagar)
  IF NEW.empresa_transportadora_id IS NOT NULL THEN
    INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
    VALUES (NEW.empresa_transportadora_id, 'a_pagar', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
    ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;

    SELECT id INTO v_fatura_trans_id FROM faturas
    WHERE empresa_id = NEW.empresa_transportadora_id AND tipo = 'a_pagar'
      AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;

    NEW.fatura_transportadora_id := v_fatura_trans_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_vincular_fatura ON public.financeiro_entregas;
CREATE TRIGGER trg_vincular_fatura
  BEFORE INSERT ON public.financeiro_entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.vincular_fatura_automatica();
```

---

## 6️⃣ FUNCTION — recalcular_fatura (trigger AFTER INSERT/UPDATE em financeiro_entregas)

> Recalcula os totais (bruto, comissão, líquido, qtd) da fatura sempre que um registro financeiro é inserido ou atualizado.

```sql
CREATE OR REPLACE FUNCTION public.recalcular_fatura()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.fatura_embarcador_id IS NOT NULL THEN
    UPDATE faturas SET
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
      WHERE fatura_embarcador_id = NEW.fatura_embarcador_id
    ) sub
    WHERE id = NEW.fatura_embarcador_id;
  END IF;

  IF NEW.fatura_transportadora_id IS NOT NULL THEN
    UPDATE faturas SET
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
      WHERE fatura_transportadora_id = NEW.fatura_transportadora_id
    ) sub
    WHERE id = NEW.fatura_transportadora_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_recalcular_fatura ON public.financeiro_entregas;
CREATE TRIGGER trg_recalcular_fatura
  AFTER INSERT OR UPDATE ON public.financeiro_entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.recalcular_fatura();
```

---

## 7️⃣ FUNCTION — validar_fatura (trigger de validação)

```sql
CREATE OR REPLACE FUNCTION public.validar_fatura()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.quinzena NOT IN (1, 2) THEN
    RAISE EXCEPTION 'quinzena deve ser 1 ou 2';
  END IF;
  IF NEW.mes < 1 OR NEW.mes > 12 THEN
    RAISE EXCEPTION 'mes deve estar entre 1 e 12';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_fatura ON public.faturas;
CREATE TRIGGER trg_validar_fatura
  BEFORE INSERT OR UPDATE ON public.faturas
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_fatura();
```

---

## 8️⃣ BACKFILL — Vincular registros financeiros existentes a faturas

> ⚠️ Executa uma vez para preencher registros criados antes do trigger `vincular_fatura_automatica` existir. Pode demorar dependendo do volume.

```sql
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

    v_fatura_emb_id := NULL;
    IF rec.empresa_embarcadora_id IS NOT NULL THEN
      INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
      VALUES (rec.empresa_embarcadora_id, 'a_receber', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
      ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;

      SELECT id INTO v_fatura_emb_id FROM faturas
      WHERE empresa_id = rec.empresa_embarcadora_id AND tipo = 'a_receber'
        AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;
    END IF;

    v_fatura_trans_id := NULL;
    IF rec.empresa_transportadora_id IS NOT NULL THEN
      INSERT INTO faturas (empresa_id, tipo, quinzena, mes, ano, periodo_inicio, periodo_fim)
      VALUES (rec.empresa_transportadora_id, 'a_pagar', v_quinzena, v_mes, v_ano, v_periodo_inicio, v_periodo_fim)
      ON CONFLICT (empresa_id, tipo, ano, mes, quinzena) DO NOTHING;

      SELECT id INTO v_fatura_trans_id FROM faturas
      WHERE empresa_id = rec.empresa_transportadora_id AND tipo = 'a_pagar'
        AND ano = v_ano AND mes = v_mes AND quinzena = v_quinzena;
    END IF;

    UPDATE financeiro_entregas SET
      fatura_embarcador_id = COALESCE(v_fatura_emb_id, fatura_embarcador_id),
      fatura_transportadora_id = COALESCE(v_fatura_trans_id, fatura_transportadora_id)
    WHERE id = rec.id;
  END LOOP;
END $$;
```

---

## 9️⃣ BACKFILL — Recalcular totais de todas as faturas

```sql
-- Recalcular faturas de embarcadores
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

-- Recalcular faturas de transportadoras
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
```

---

## 🔟 PÓS-MIGRAÇÃO — Reload do Schema Cache

```sql
NOTIFY pgrst, 'reload schema';
```

---

## 📦 ORDEM DE EXECUÇÃO

1. **Seção 1** — ENUM `em_transito`
2. **Seção 2** — Novas colunas (`numero_pedido`, `comissao_hubfrete_percent`)
3. **Seção 3** — Padronizar comissão (UPDATE + NOT NULL)
4. **Seção 4** — Function `criar_financeiro_entrega` + trigger
5. **Seção 5** — Function `vincular_fatura_automatica` + trigger
6. **Seção 6** — Function `recalcular_fatura` + trigger
7. **Seção 7** — Function `validar_fatura` + trigger
8. **Seção 8** — Backfill: vincular registros existentes a faturas
9. **Seção 9** — Backfill: recalcular totais das faturas
10. **Seção 10** — Reload do schema cache

---

## ⚠️ Notas Importantes

- **Seção 3**: Antes de executar, verificar se alguma empresa precisa de comissão diferente de 10%. Se sim, ajustar manualmente APÓS o UPDATE genérico.
- **Seção 8-9**: Os backfills são idempotentes — podem ser executados múltiplas vezes sem duplicar dados (usam `ON CONFLICT DO NOTHING` e `COALESCE`).
- **Edge Functions**: As functions `finalizar-entrega`, `focusnfe-cte`, `focusnfe-mdfe` serão atualizadas automaticamente ao publicar o app. Não é necessário deploy manual.
- **Tabela `faturas`**: Precisa ter o UNIQUE constraint `(empresa_id, tipo, ano, mes, quinzena)` para o `ON CONFLICT` funcionar. Se não existir na produção, criar antes da Seção 5:
  ```sql
  ALTER TABLE faturas ADD CONSTRAINT faturas_empresa_tipo_periodo_unique 
    UNIQUE (empresa_id, tipo, ano, mes, quinzena);
  ```
