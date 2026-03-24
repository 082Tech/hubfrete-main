# Plano de Migração para Produção — V2

**Data:** 2026-03-24  
**Período coberto:** Migrations de 19/03/2026 a 23/03/2026 (3 arquivos)  
**Pré-requisito:** Plano V1 (17/03) já executado na produção

---

## Resumo Executivo

As alterações deste ciclo focaram em **3 áreas**:
1. **Financeiro** — Nova tabela `solicitacoes_antecipacao` para pedidos de antecipação de recebíveis
2. **Cadastro** — Novas colunas em `pre_cadastros` e enum `classe_empresa` para fluxo completo de transportadoras
3. **Limpeza Estrutural** — Remoção de colunas legadas de documentos fiscais (`cte_url`, `numero_cte`, `manifesto_url`)

---

## ⚠️ IMPORTANTE — Antes de Executar

1. **Faça backup do banco de produção**
2. O **Bloco 3** é **DESTRUTIVO** — remove colunas. Verifique se o app móvel não depende de `cte_url`, `numero_cte` ou `manifesto_url`
3. Execute os blocos na ordem indicada
4. Teste cada bloco no SQL Editor antes de commitar

---

## Bloco 1 — Financeiro: Tabela `solicitacoes_antecipacao` (Nova)

> Origem: `20260319191928`

```sql
-- 1.1 Extensão moddatetime (provavelmente já existe em produção)
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- 1.2 Tabela de solicitações de antecipação de recebíveis
CREATE TABLE IF NOT EXISTS public.solicitacoes_antecipacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financeiro_entrega_id uuid NOT NULL REFERENCES public.financeiro_entregas(id) ON DELETE CASCADE,
  solicitante_user_id uuid NOT NULL,
  solicitante_tipo text NOT NULL DEFAULT 'transportadora',
  empresa_id integer REFERENCES public.empresas(id),
  motorista_id uuid REFERENCES public.motoristas(id),
  valor_original numeric NOT NULL,
  taxa_percent numeric NOT NULL,
  valor_taxa numeric NOT NULL,
  valor_final numeric NOT NULL,
  dias_antecipados integer NOT NULL,
  data_vencimento_original date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  motivo_rejeicao text,
  aprovado_por uuid,
  aprovado_em timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.3 Índices
CREATE INDEX IF NOT EXISTS idx_solicitacoes_antecipacao_status 
  ON public.solicitacoes_antecipacao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_antecipacao_financeiro 
  ON public.solicitacoes_antecipacao(financeiro_entrega_id);

-- 1.4 RLS
ALTER TABLE public.solicitacoes_antecipacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access solicitacoes_antecipacao"
  ON public.solicitacoes_antecipacao FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Empresa can view own solicitacoes"
  ON public.solicitacoes_antecipacao FOR SELECT TO authenticated
  USING (empresa_id IN (
    SELECT f.empresa_id FROM usuarios u
    JOIN usuarios_filiais uf ON uf.usuario_id = u.id
    JOIN filiais f ON f.id = uf.filial_id
    WHERE u.auth_user_id = auth.uid()
  ));

CREATE POLICY "Empresa can insert solicitacoes"
  ON public.solicitacoes_antecipacao FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (
    SELECT f.empresa_id FROM usuarios u
    JOIN usuarios_filiais uf ON uf.usuario_id = u.id
    JOIN filiais f ON f.id = uf.filial_id
    WHERE u.auth_user_id = auth.uid()
  ));

-- 1.5 Trigger de updated_at
CREATE TRIGGER trg_solicitacoes_antecipacao_updated_at
  BEFORE UPDATE ON public.solicitacoes_antecipacao
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
```

---

## Bloco 2 — Cadastro: Colunas `pre_cadastros` + Enum `classe_empresa`

> Origem: `20260320180334`

```sql
-- 2.1 Coluna status em empresas (idempotente)
ALTER TABLE public.empresas 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';

-- 2.2 Novo valor no enum classe_empresa
ALTER TYPE public.classe_empresa ADD VALUE IF NOT EXISTS 'TRANSPORTADORA';

-- 2.3 Novas colunas em pre_cadastros para cadastro completo
ALTER TABLE public.pre_cadastros
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES public.empresas(id);

-- 2.4 Policy para inserção anônima em pre_cadastros
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pre_cadastros' 
    AND policyname = 'Allow anonymous insert pre_cadastros'
  ) THEN
    CREATE POLICY "Allow anonymous insert pre_cadastros"
    ON public.pre_cadastros
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END$$;
```

---

## Bloco 3 — 🔴 DESTRUTIVO: Remoção de colunas legadas de documentos

> Origem: `20260323121741`  
> ⚠️ **DESTRUTIVO** — Remove colunas e triggers legados. Certifique-se de que o app mobile não usa mais essas colunas.

```sql
-- 3.1 Remover trigger legado de notificação CT-e
DROP TRIGGER IF EXISTS trigger_cte_attached ON public.entregas;
DROP FUNCTION IF EXISTS public.notify_cte_attached();

-- 3.2 Remover colunas legadas de entregas
ALTER TABLE public.entregas DROP COLUMN IF EXISTS cte_url;
ALTER TABLE public.entregas DROP COLUMN IF EXISTS numero_cte;
ALTER TABLE public.entregas DROP COLUMN IF EXISTS manifesto_url;

-- 3.3 Remover coluna legada de viagens
ALTER TABLE public.viagens DROP COLUMN IF EXISTS manifesto_url;
```

---

## Bloco 4 — Config Fiscal: Novas colunas (do Plano Fiscal)

> Origem: Plano `plan.md` — colunas para emissão CT-e/MDF-e via Focus NFe  
> ⚠️ Verifique se a migration já foi aplicada no teste antes de rodar em produção

```sql
ALTER TABLE public.config_fiscal
  ADD COLUMN IF NOT EXISTS regime_tributario_emitente INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS icms_base_calculo_percentual NUMERIC(5,2) NOT NULL DEFAULT 100.00;

COMMENT ON COLUMN public.config_fiscal.regime_tributario_emitente
  IS '1 = Simples Nacional, 3 = Regime Normal';
COMMENT ON COLUMN public.config_fiscal.icms_base_calculo_percentual
  IS 'Percentual da base de calculo do ICMS (ex: 100.00 = base integral)';
```

---

## 🚫 Migrations de TESTE (NÃO rodar em produção)

| Migration | Conteúdo | Motivo |
|-----------|----------|--------|
| `20260317180447` a `20260317190425` | Execução do Plano V1 | Já aplicado na produção via Plano V1 |

---

## Checklist Pós-Migração

- [ ] Verificar se `solicitacoes_antecipacao` foi criada com RLS e índices
- [ ] Verificar se `empresas.status` existe com default `'ativa'`
- [ ] Verificar se enum `classe_empresa` contém `'TRANSPORTADORA'`
- [ ] Verificar se `pre_cadastros` tem as novas colunas (`razao_social`, `auth_user_id`, etc.)
- [ ] Verificar se colunas `cte_url`, `numero_cte`, `manifesto_url` foram removidas de `entregas`
- [ ] Verificar se `viagens.manifesto_url` foi removida
- [ ] Verificar se `config_fiscal` tem `regime_tributario_emitente` e `icms_base_calculo_percentual`
- [ ] Publicar o código no Lovable após confirmar a migração

---

## Ordem de Execução Recomendada

1. **Bloco 1** — `solicitacoes_antecipacao` (independente)
2. **Bloco 2** — `pre_cadastros` + enum (independente)
3. **Bloco 4** — `config_fiscal` colunas fiscais (independente)
4. **Bloco 3** — Remoção de colunas legadas (**por último**, após validar que app mobile não usa)
