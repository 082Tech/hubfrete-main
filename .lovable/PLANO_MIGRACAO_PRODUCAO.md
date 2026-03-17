# Plano de Migração para Produção

**Data:** 2026-03-17  
**Período coberto:** Migrations de 12/03/2026 a 17/03/2026 (15 arquivos)

---

## Resumo Executivo

As alterações deste ciclo focaram em **3 áreas principais**:
1. **Sistema Financeiro** — Novo modelo D+30 individual (substituindo faturas quinzenais)
2. **Rastreamento Público** — Função `get_public_tracking_info` atualizada com dados de origem/destino e carroceria
3. **Estrutura Operacional** — Tabela `carga_eventos` e coluna `dados_bancarios` em motoristas

---

## ⚠️ IMPORTANTE — Antes de Executar

1. **Faça backup do banco de produção**
2. As operações de **DATA UPDATE** (marcadas com 🔶) devem ser avaliadas — elas foram escritas para o ambiente de teste e podem não se aplicar diretamente à produção
3. Execute os blocos na ordem indicada
4. Teste cada bloco no SQL Editor antes de commitar

---

## Bloco 1 — Estrutura: Tabela `carga_eventos` (Nova)

> Origem: `20260313204031`

```sql
-- Tabela de eventos/timeline de cargas (ofertas)
CREATE TABLE IF NOT EXISTS public.carga_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carga_id uuid NOT NULL REFERENCES public.cargas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  observacao text,
  user_id uuid,
  user_nome text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.carga_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carga_eventos_select" ON public.carga_eventos FOR SELECT USING (true);
CREATE POLICY "carga_eventos_insert" ON public.carga_eventos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "carga_eventos_update" ON public.carga_eventos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "carga_eventos_delete" ON public.carga_eventos FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_carga_eventos_carga_id ON public.carga_eventos(carga_id);
CREATE INDEX IF NOT EXISTS idx_carga_eventos_timestamp ON public.carga_eventos(timestamp DESC);
```

---

## Bloco 2 — Estrutura: Coluna `dados_bancarios` em `motoristas`

> Origem: `20260312202549` / `20260312211510` / `20260312214835` (duplicadas, idempotente)

```sql
ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS dados_bancarios jsonb DEFAULT NULL;
```

---

## Bloco 3 — Financeiro: Tabela `empresa_config_financeira` + Colunas novas em `financeiro_entregas`

> Origem: `20260317113503`

```sql
-- 3.1 Tabela de configuração financeira por embarcador
CREATE TABLE IF NOT EXISTS public.empresa_config_financeira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id integer REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tipo_pagamento text NOT NULL DEFAULT 'pos_pago',
  prazo_dias integer NOT NULL DEFAULT 30,
  dia_fixo integer,
  ciclo_faturamento text DEFAULT 'mensal',
  antecipacao_permitida boolean NOT NULL DEFAULT false,
  taxa_antecipacao_percent numeric NOT NULL DEFAULT 2.0,
  limite_credito numeric NOT NULL DEFAULT 0,
  credito_utilizado numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_config_financeira ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage empresa_config_financeira"
  ON public.empresa_config_financeira
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Empresa users can view own config"
  ON public.empresa_config_financeira
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TRIGGER update_empresa_config_financeira_updated_at
  BEFORE UPDATE ON public.empresa_config_financeira
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.empresa_config_financeira 
  IS 'Configuração financeira por embarcador: tipo de pagamento, prazo, antecipação, limite de crédito';

-- 3.2 Novas colunas em financeiro_entregas (antecipação + motorista)
ALTER TABLE public.financeiro_entregas
  ADD COLUMN IF NOT EXISTS antecipado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_antecipacao timestamptz,
  ADD COLUMN IF NOT EXISTS taxa_antecipacao_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dias_antecipados integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_taxa_antecipacao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motorista_id uuid REFERENCES public.motoristas(id),
  ADD COLUMN IF NOT EXISTS tipo_beneficiario text DEFAULT 'transportadora';

-- 3.3 Coluna calculada valor_final
-- NOTA: Se já existir uma coluna valor_final normal, remova-a primeiro:
-- ALTER TABLE public.financeiro_entregas DROP COLUMN IF EXISTS valor_final;
ALTER TABLE public.financeiro_entregas
  ADD COLUMN IF NOT EXISTS valor_final numeric GENERATED ALWAYS AS (valor_liquido - COALESCE(valor_taxa_antecipacao, 0)) STORED;

COMMENT ON COLUMN public.financeiro_entregas.antecipado IS 'Se o recebível foi antecipado';
COMMENT ON COLUMN public.financeiro_entregas.data_vencimento IS 'D+30 a partir da finalização da entrega';
COMMENT ON COLUMN public.financeiro_entregas.tipo_beneficiario IS 'transportadora ou autonomo';
```

---

## Bloco 4 — Financeiro: Remover sistema de faturas quinzenais legado

> Origem: `20260317120739` + `20260317124045`  
> ⚠️ **DESTRUTIVO** — Apaga tabelas `faturas` e `faturas_motoristas`

```sql
-- 4.1 Desvincular financeiro_entregas das faturas antigas
UPDATE financeiro_entregas SET fatura_embarcador_id = NULL WHERE fatura_embarcador_id IS NOT NULL;
UPDATE financeiro_entregas SET fatura_transportadora_id = NULL WHERE fatura_transportadora_id IS NOT NULL;
UPDATE financeiro_entregas SET fatura_motorista_id = NULL WHERE fatura_motorista_id IS NOT NULL;

-- 4.2 Remover triggers antigos de faturas quinzenais
DROP TRIGGER IF EXISTS trg_vincular_fatura ON financeiro_entregas;
DROP TRIGGER IF EXISTS trg_recalcular_fatura ON financeiro_entregas;
DROP TRIGGER IF EXISTS trg_vincular_fatura_motorista ON financeiro_entregas;
DROP TRIGGER IF EXISTS trg_recalcular_fatura_motorista ON financeiro_entregas;
DROP TRIGGER IF EXISTS vincular_fatura_motorista_trigger ON financeiro_entregas;
DROP TRIGGER IF EXISTS recalcular_fatura_motorista_trigger ON financeiro_entregas;

-- 4.3 Remover funções legado
DROP FUNCTION IF EXISTS vincular_fatura_automatica() CASCADE;
DROP FUNCTION IF EXISTS recalcular_fatura() CASCADE;
DROP FUNCTION IF EXISTS vincular_fatura_motorista_automatica() CASCADE;
DROP FUNCTION IF EXISTS recalcular_fatura_motorista() CASCADE;
DROP FUNCTION IF EXISTS validar_fatura() CASCADE;
DROP FUNCTION IF EXISTS validar_fatura_motorista() CASCADE;

-- 4.4 Remover tabelas legado
DROP TABLE IF EXISTS faturas_motoristas CASCADE;
DROP TABLE IF EXISTS faturas CASCADE;

-- 4.5 Remover enums legado
DROP TYPE IF EXISTS status_fatura CASCADE;
DROP TYPE IF EXISTS tipo_fatura CASCADE;
```

---

## Bloco 5 — Financeiro: Atualizar trigger `criar_financeiro_entrega`

> Origem: `20260317113503`  
> Agora inclui `motorista_id`, `tipo_beneficiario` e `data_vencimento = D+30`

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
  v_motorista_id UUID;
  v_tipo_cadastro TEXT;
  v_comissao_percent NUMERIC;
  v_valor_frete NUMERIC;
  v_valor_comissao NUMERIC;
  v_valor_liquido NUMERIC;
  v_data_vencimento TIMESTAMPTZ;
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

    v_valor_frete := COALESCE(NEW.valor_frete, 0);
    v_valor_comissao := ROUND(v_valor_frete * v_comissao_percent / 100, 2);
    v_valor_liquido := v_valor_frete - v_valor_comissao;

    v_data_vencimento := COALESCE(NEW.entregue_em, NOW()) + INTERVAL '30 days';

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
  END IF;

  RETURN NEW;
END;
$function$;
```

---

## Bloco 6 — 🔶 Backfill de dados financeiros (AVALIAR PARA PRODUÇÃO)

> Origem: `20260317124045` + `20260317141439`  
> ⚠️ Estes são comandos de DATA — rodar apenas se necessário na produção

```sql
-- 6.1 Garantir entregue_em em entregas finalizadas
UPDATE entregas 
SET entregue_em = COALESCE(updated_at, created_at, NOW())
WHERE status = 'entregue' AND entregue_em IS NULL;

-- 6.2 Criar financeiro_entregas faltantes para entregas já concluídas
INSERT INTO financeiro_entregas (
  entrega_id, empresa_transportadora_id, empresa_embarcadora_id,
  valor_frete, valor_comissao, valor_liquido,
  data_vencimento, motorista_id, tipo_beneficiario, status
)
SELECT 
  e.id,
  m.empresa_id,
  c.empresa_id,
  COALESCE(e.valor_frete, 0),
  ROUND(COALESCE(e.valor_frete, 0) * COALESCE(emp.comissao_hubfrete_percent, 20) / 100, 2),
  COALESCE(e.valor_frete, 0) - ROUND(COALESCE(e.valor_frete, 0) * COALESCE(emp.comissao_hubfrete_percent, 20) / 100, 2),
  COALESCE(e.entregue_em, NOW()) + INTERVAL '30 days',
  e.motorista_id,
  CASE WHEN m.tipo_cadastro = 'autonomo' THEN 'autonomo' ELSE 'transportadora' END,
  'pendente'
FROM entregas e
JOIN cargas c ON c.id = e.carga_id
LEFT JOIN motoristas m ON m.id = e.motorista_id
LEFT JOIN empresas emp ON emp.id = c.empresa_id
WHERE e.status = 'entregue'
  AND NOT EXISTS (SELECT 1 FROM financeiro_entregas fe WHERE fe.entrega_id = e.id);

-- 6.3 Backfill data_vencimento NULL
UPDATE financeiro_entregas f
SET data_vencimento = (e.entregue_em + INTERVAL '30 days')::date
FROM entregas e
WHERE e.id = f.entrega_id
  AND f.data_vencimento IS NULL
  AND e.entregue_em IS NOT NULL;

UPDATE financeiro_entregas f
SET data_vencimento = (f.created_at + INTERVAL '30 days')::date
WHERE f.data_vencimento IS NULL;
```

---

## Bloco 7 — Função `get_public_tracking_info` (versão final)

> Origem: `20260316140157` → `20260316144937` → `20260316145023` → `20260316150249`  
> Consolidado na versão final com `search_path`, `carroceria_id_2` e dados de `origem/destino`

```sql
CREATE OR REPLACE FUNCTION public.get_public_tracking_info(_tracking_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_entrega_id uuid;
  v_nfe_id uuid;
  v_result json;
BEGIN
  SELECT id INTO v_entrega_id
  FROM entregas
  WHERE tracking_code = _tracking_code
  LIMIT 1;

  IF v_entrega_id IS NULL THEN
    RETURN json_build_object(
      'error', 'Rastreio não encontrado. Verifique o código e tente novamente.'
    );
  END IF;

  SELECT id INTO v_nfe_id
  FROM nfes
  WHERE entrega_id = v_entrega_id
  LIMIT 1;

  SELECT json_build_object(
    'nfe', (
      SELECT json_build_object(
        'numero', n.numero,
        'serie', n.serie,
        'emitente', n.remetente_razao_social,
        'destinatario', n.destinatario_razao_social,
        'valor', n.valor_total
      )
      FROM nfes n WHERE n.id = v_nfe_id
    ),
    'entrega', (
      SELECT json_build_object(
        'id', e.id,
        'status', e.status,
        'tracking_code', e.tracking_code,
        'previsao_entrega', c.data_entrega_limite,
        'motorista', (
           SELECT json_build_object(
             'nome', m.nome_completo,
             'foto', m.foto_url
           )
           FROM motoristas m 
           WHERE m.id = e.motorista_id
        ),
        'veiculo', (
           SELECT json_build_object(
             'placa', v.placa,
             'marca', v.marca,
             'modelo', v.modelo,
             'tipo', v.tipo,
             'carroceria', COALESCE(c_ent.tipo, c_veic.tipo, v.carroceria::text),
             'capacidade_kg', CASE 
                 WHEN v.carroceria_integrada THEN v.capacidade_kg 
                 ELSE COALESCE(c_ent.capacidade_kg, c_veic.capacidade_kg, v.capacidade_kg)
             END,
             'capacidade_m3', CASE
                 WHEN v.carroceria_integrada THEN v.capacidade_m3
                 ELSE COALESCE(c_ent.capacidade_m3, c_veic.capacidade_m3, v.capacidade_m3)
             END
           )
           FROM veiculos v 
           LEFT JOIN carrocerias c_ent ON c_ent.id = e.carroceria_id
           LEFT JOIN carrocerias c_veic ON c_veic.id = v.carroceria_id_2
           WHERE v.id = e.veiculo_id
        ),
        'placa_veiculo', (
           SELECT v.placa 
           FROM veiculos v 
           WHERE v.id = e.veiculo_id
        ),
        'localizacao_atual', (
           SELECT json_build_object(
             'latitude', l.latitude,
             'longitude', l.longitude,
             'updated_at', l.updated_at
           )
           FROM locations l
           WHERE l.motorista_id = e.motorista_id
           ORDER BY l.updated_at DESC
           LIMIT 1
        ),
        'carga', (
           json_build_object(
             'descricao', c.descricao,
             'peso', e.peso_alocado_kg,
             'peso_total_carga', c.peso_kg,
             'volume', c.volume_m3,
             'valor', c.valor_mercadoria,
             'quantidade', c.quantidade
           )
        ),
        'origem', (
           SELECT json_build_object(
             'latitude', eo.latitude,
             'longitude', eo.longitude,
             'cidade', eo.cidade,
             'estado', eo.estado
           )
           FROM enderecos_carga eo
           WHERE eo.id = c.endereco_origem_id
        ),
        'destino', (
           SELECT json_build_object(
             'latitude', ed.latitude,
             'longitude', ed.longitude,
             'cidade', ed.cidade,
             'estado', ed.estado
           )
           FROM enderecos_carga ed
           WHERE ed.id = c.endereco_destino_id
        )
      )
      FROM entregas e 
      LEFT JOIN cargas c ON c.id = e.carga_id
      WHERE e.id = v_entrega_id
    ),
    'eventos', (
      SELECT json_agg(
        json_build_object(
          'id', ev.id,
          'tipo', ev.tipo,
          'descricao', ev.observacao,
          'data', ev.created_at,
          'localizacao', CONCAT(ev.latitude, ', ', ev.longitude)
        ) ORDER BY ev.created_at DESC
      )
      FROM entrega_eventos ev
      WHERE ev.entrega_id = v_entrega_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
```

---

## 🚫 Migrations de TESTE (NÃO rodar em produção)

Estas migrations continham operações de dados específicas do ambiente de teste:

| Migration | Conteúdo | Motivo para não rodar |
|-----------|----------|-----------------------|
| `20260312223212` | `UPDATE cargas SET empresa_id = 2 WHERE empresa_id = 999` | Correção de dados de teste específicos |
| `20260312193709` | Criação de `faturas_motoristas` | Tabela legado já removida no Bloco 4 |
| `20260312195413` | Triggers de faturas quinzenais + backfill | Sistema legado já removido no Bloco 4 |

---

## Checklist Pós-Migração

- [ ] Verificar se `empresa_config_financeira` foi criada com RLS
- [ ] Verificar se `carga_eventos` foi criada com índices
- [ ] Verificar se `financeiro_entregas` tem as novas colunas (`antecipado`, `motorista_id`, `tipo_beneficiario`, `valor_final`)
- [ ] Verificar se `motoristas.dados_bancarios` existe
- [ ] Verificar se tabelas `faturas` e `faturas_motoristas` foram removidas
- [ ] Verificar se a função `get_public_tracking_info` retorna `origem` e `destino`
- [ ] Verificar se o trigger `criar_financeiro_entrega` está com a versão atualizada
- [ ] Rodar Bloco 6 (backfill) se houver entregas entregues sem registro financeiro
- [ ] Publicar o código no Lovable após confirmar a migração

---

## Dependências de Colunas (Pré-requisitos na Produção)

A função `get_public_tracking_info` referencia `veiculos.carroceria_id_2`. **Confirme que esta coluna existe na produção.** Se não existir, adicione:

```sql
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS carroceria_id_2 uuid REFERENCES public.carrocerias(id);
```

---

## Ordem de Execução Recomendada

1. **Bloco 1** — `carga_eventos` (independente)
2. **Bloco 2** — `motoristas.dados_bancarios` (independente)
3. **Bloco 3** — Estrutura financeira nova
4. **Bloco 4** — Remover sistema legado de faturas
5. **Bloco 5** — Trigger atualizado
6. **Bloco 7** — Função de rastreamento
7. **Bloco 6** — Backfill de dados (por último, após validar estrutura)
