# Plano de Migração: Sincronizar DEV com Produção

**Data:** 2026-04-13  
**Objetivo:** Trazer o banco de desenvolvimento (`ublyithvarvtqbwmxtyh`) para o mesmo estado do banco de produção (`eilwdavgnuhfyxfqkvrk`), aplicando todas as alterações feitas diretamente em produção desde ~31/03/2026.  
**Período coberto:** 31/03/2026 a 13/04/2026 (19 migrations)

---

## 📋 Passo a Passo

### Passo 0 — Trocar Supabase para DEV

1. No Lovable, desconectar o Supabase de produção (`eilwdavgnuhfyxfqkvrk`)
2. Conectar o Supabase de desenvolvimento (`ublyithvarvtqbwmxtyh`)
3. Os arquivos `.env` e `client.ts` serão atualizados automaticamente

---

### Passo 1 — Backup do banco DEV

Antes de aplicar qualquer coisa, faça um backup do banco DEV no dashboard do Supabase.

---

## 🔄 Migrations a Aplicar no DEV

As migrations abaixo devem ser executadas **na ordem** via SQL Editor do Supabase DEV. Estão organizadas em blocos lógicos.

---

### Bloco 1 — Cargas: Agendamento (31/03)

```sql
ALTER TABLE cargas
  ADD COLUMN IF NOT EXISTS agendamento_entrega boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_agendamento text;
```

---

### Bloco 2 — Chat: Suporte a Áudio (31/03)

```sql
-- 2.1 Colunas
ALTER TABLE public.mensagens 
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duracao integer,
  ADD COLUMN IF NOT EXISTS audio_transcricao text;

-- 2.2 Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-audios', 'chat-audios', true, 10485760, ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

-- 2.3 Políticas de Storage
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload audio" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-audios');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can view chat audios" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'chat-audios');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

---

### Bloco 3 — Financeiro: Crédito Automático (31/03)

```sql
-- 3.1 Trigger criar_financeiro_entrega (versão com prazo_dias + crédito)
CREATE OR REPLACE FUNCTION public.criar_financeiro_entrega()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
    IF EXISTS (SELECT 1 FROM financeiro_entregas WHERE entrega_id = NEW.id) THEN RETURN NEW; END IF;
    SELECT c.empresa_id INTO v_embarcador_empresa_id FROM cargas c WHERE c.id = NEW.carga_id;
    SELECT m.empresa_id, m.id, m.tipo_cadastro::text INTO v_transportadora_empresa_id, v_motorista_id, v_tipo_cadastro FROM motoristas m WHERE m.id = NEW.motorista_id;
    SELECT COALESCE(e.comissao_hubfrete_percent, 0) INTO v_comissao_percent FROM empresas e WHERE e.id = v_embarcador_empresa_id;
    SELECT COALESCE(ecf.prazo_dias, 30) INTO v_prazo_dias FROM empresa_config_financeira ecf WHERE ecf.empresa_id = v_embarcador_empresa_id;
    IF v_prazo_dias IS NULL THEN v_prazo_dias := 30; END IF;
    v_valor_frete := COALESCE(NEW.valor_frete, 0);
    v_valor_comissao := ROUND(v_valor_frete * v_comissao_percent / 100, 2);
    v_valor_liquido := v_valor_frete - v_valor_comissao;
    v_data_vencimento := COALESCE(NEW.entregue_em, NOW()) + (v_prazo_dias || ' days')::interval;
    INSERT INTO financeiro_entregas (entrega_id, empresa_transportadora_id, empresa_embarcadora_id, valor_frete, valor_comissao, valor_liquido, data_vencimento, motorista_id, tipo_beneficiario)
    VALUES (NEW.id, v_transportadora_empresa_id, v_embarcador_empresa_id, v_valor_frete, v_valor_comissao, v_valor_liquido, v_data_vencimento, v_motorista_id, CASE WHEN v_tipo_cadastro = 'autonomo' THEN 'autonomo' ELSE 'transportadora' END);
    UPDATE empresa_config_financeira SET credito_utilizado = credito_utilizado + v_valor_frete, updated_at = NOW() WHERE empresa_id = v_embarcador_empresa_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3.2 Ajustar crédito na baixa
CREATE OR REPLACE FUNCTION public.ajustar_credito_na_baixa()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') THEN
    IF NEW.empresa_embarcadora_id IS NOT NULL THEN
      UPDATE empresa_config_financeira SET credito_utilizado = GREATEST(0, credito_utilizado - COALESCE(NEW.valor_frete, 0)), updated_at = NOW() WHERE empresa_id = NEW.empresa_embarcadora_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ajustar_credito_na_baixa ON financeiro_entregas;
CREATE TRIGGER trg_ajustar_credito_na_baixa AFTER UPDATE ON financeiro_entregas FOR EACH ROW EXECUTE FUNCTION ajustar_credito_na_baixa();
```

---

### Bloco 4 — Auditoria: Enriquecimento Completo (31/03 + 06/04)

```sql
-- 4.1 Ajuste tipo + colunas extras
ALTER TABLE auditoria_logs ALTER COLUMN registro_id TYPE text USING registro_id::text;
ALTER TABLE public.auditoria_logs
  ADD COLUMN IF NOT EXISTS usuario_nome text,
  ADD COLUMN IF NOT EXISTS registro_codigo text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS empresa_nome text;

-- 4.2 Função de auditoria (versão final com empresa_nome)
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_user_nome text;
  v_registro_codigo text;
  v_ip text;
  v_descricao text;
  v_operacao_label text;
  v_record jsonb;
  v_empresa_id bigint;
  v_empresa_nome text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT nome INTO v_user_nome FROM public.usuarios WHERE auth_user_id = v_user_id LIMIT 1;
    IF v_user_nome IS NULL THEN SELECT nome INTO v_user_nome FROM public.torre_users WHERE user_id = v_user_id LIMIT 1; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN v_record := to_jsonb(OLD); ELSE v_record := to_jsonb(NEW); END IF;
  v_registro_codigo := v_record ->> 'codigo';
  v_empresa_id := (v_record ->> 'empresa_id')::bigint;
  IF v_empresa_id IS NOT NULL THEN
    SELECT COALESCE(nome_fantasia, razao_social, nome) INTO v_empresa_nome FROM public.empresas WHERE id = v_empresa_id LIMIT 1;
  END IF;
  BEGIN v_ip := current_setting('request.headers', true)::json ->> 'x-forwarded-for'; EXCEPTION WHEN OTHERS THEN v_ip := NULL; END;
  CASE TG_OP WHEN 'INSERT' THEN v_operacao_label := 'Criou'; WHEN 'UPDATE' THEN v_operacao_label := 'Atualizou'; WHEN 'DELETE' THEN v_operacao_label := 'Removeu'; ELSE v_operacao_label := TG_OP; END CASE;
  v_descricao := v_operacao_label || ' registro em ' || TG_TABLE_NAME;
  IF v_registro_codigo IS NOT NULL THEN v_descricao := v_descricao || ' (' || v_registro_codigo || ')'; END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, usuario_nome, registro_codigo, ip_address, descricao, dados_anteriores, dados_novos, empresa_nome) VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::text, v_user_id, v_user_nome, v_registro_codigo, v_ip, v_descricao, NULL, to_jsonb(NEW), v_empresa_nome); RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, usuario_nome, registro_codigo, ip_address, descricao, dados_anteriores, dados_novos, empresa_nome) VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::text, v_user_id, v_user_nome, v_registro_codigo, v_ip, v_descricao, to_jsonb(OLD), to_jsonb(NEW), v_empresa_nome); RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, usuario_nome, registro_codigo, ip_address, descricao, dados_anteriores, dados_novos, empresa_nome) VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::text, v_user_id, v_user_nome, v_registro_codigo, v_ip, v_descricao, to_jsonb(OLD), NULL, v_empresa_nome); RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- 4.3 Attach triggers (16 tabelas + 3 extras)
DO $$
DECLARE
  tbl TEXT;
  tables_to_audit TEXT[] := ARRAY[
    'empresas', 'motoristas', 'veiculos', 'carrocerias',
    'cargas', 'entregas', 'filiais', 'usuarios',
    'usuarios_filiais', 'financeiro_entregas', 'empresa_config_financeira',
    'chats', 'ctes', 'documentos_validacao', 'geofences', 'viagens',
    'company_invites', 'cargo_permissoes', 'entrega_eventos'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_audit LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger()', tbl, tbl);
  END LOOP;
END;
$$;

-- 4.4 Índices
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_timestamp ON auditoria_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_tabela ON auditoria_logs (tabela);
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_operacao ON auditoria_logs (operacao);
```

> ⚠️ **NÃO executar os backfills** de `usuario_nome`, `registro_codigo`, `empresa_nome` no DEV — esses eram para dados históricos de produção. O banco DEV terá dados diferentes.

---

### Bloco 5 — Normalização de Status + Notificações (31/03)

```sql
-- 5.1 Normalização
CREATE OR REPLACE FUNCTION normalize_entrega_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public'
AS $$
DECLARE raw_text TEXT; normalized TEXT;
BEGIN
  raw_text := NEW.status::text;
  normalized := CASE lower(raw_text)
    WHEN 'aguardando' THEN 'aguardando' WHEN 'saiu_para_coleta' THEN 'saiu_para_coleta'
    WHEN 'em_transito' THEN 'em_transito' WHEN 'saiu_para_entrega' THEN 'saiu_para_entrega'
    WHEN 'entregue' THEN 'entregue' WHEN 'cancelada' THEN 'cancelada'
    WHEN 'problema' THEN 'problema' ELSE lower(raw_text)
  END;
  NEW.status := normalized::status_entrega;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_normalize_entrega_status ON entregas;
CREATE TRIGGER trigger_normalize_entrega_status BEFORE INSERT OR UPDATE OF status ON entregas FOR EACH ROW EXECUTE FUNCTION normalize_entrega_status();

-- 5.2 Notificação (versão corrigida com join via filiais)
-- [COPIAR a função notify_entrega_status_change completa da migration 20260331193449]
```

---

### Bloco 6 — Sistema de Cargos Torre (02/04)

```sql
-- 6.1 Tabelas
CREATE TABLE IF NOT EXISTS public.cargos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  editavel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escopo, nome)
);
ALTER TABLE public.cargos_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cargo_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo text NOT NULL,
  cargo text NOT NULL,
  permissao text NOT NULL,
  permitido boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escopo, cargo, permissao)
);
ALTER TABLE public.cargo_permissoes ENABLE ROW LEVEL SECURITY;

-- Triggers updated_at
CREATE TRIGGER update_cargos_config_updated_at BEFORE UPDATE ON public.cargos_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cargo_permissoes_updated_at BEFORE UPDATE ON public.cargo_permissoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (super_admin apenas) — copiar as 8 policies da migration 20260402130927

-- CHECK constraint com escopos corretos
ALTER TABLE public.cargos_config ADD CONSTRAINT cargos_config_escopo_check CHECK (escopo IN ('torre', 'embarcador', 'transportadora'));
ALTER TABLE public.cargo_permissoes ADD CONSTRAINT cargo_permissoes_escopo_check CHECK (escopo IN ('torre', 'embarcador', 'transportadora'));

-- Funções helper
-- has_cargo_permission (já existe via migration)
-- get_cargo_allowed_categories (já existe)
-- get_cargos_for_scope (já existe)
```

> ⚠️ **Seeds:** Executar os SEEDs de cargos torre + embarcador + transportadora + permissões. Copiar da migration `20260402130927` e `20260402135703`.

---

### Bloco 7 — Expiração de Cargas (06/04)

```sql
ALTER TYPE status_carga ADD VALUE IF NOT EXISTS 'expirada';

-- Função expirar_cargas_vencidas (copiar da migration 20260406193706)
```

---

### Bloco 8 — Cancelamento Completo de Viagem (06/04)

```sql
-- Função cancelar_viagem_completa atualizada (copiar da migration 20260406192237)
```

---

### Bloco 9 — Cargos por Empresa (07/04)

```sql
-- 9.1 Tabelas
CREATE TABLE IF NOT EXISTS public.empresa_cargos_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id bigint NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  editavel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome)
);
ALTER TABLE public.empresa_cargos_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.empresa_cargo_permissoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_cargo_id uuid NOT NULL REFERENCES public.empresa_cargos_config(id) ON DELETE CASCADE,
  permissao text NOT NULL,
  permitido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_cargo_id, permissao)
);
ALTER TABLE public.empresa_cargo_permissoes ENABLE ROW LEVEL SECURITY;

-- RLS policies (copiar da migration 20260407125448)
-- Trigger fn_create_default_empresa_cargo (versão FINAL com permissões=true)
-- RPCs: get_empresa_cargos, get_empresa_cargo_allowed_categories
-- Backfill ADMIN para empresas existentes + permissões com permitido=true
```

---

### Bloco 10 — Renomear ADMIN → Administrador (07/04)

```sql
-- Renomear enum
ALTER TYPE public.usuario_cargo RENAME VALUE 'ADMIN' TO 'Administrador';

-- Atualizar empresa_cargos_config
UPDATE public.empresa_cargos_config SET nome = 'Administrador' WHERE nome = 'ADMIN';

-- Atualizar trigger (copiar versão final da migration 20260407175956)
```

---

## 🔧 Edge Functions

Verificar se as seguintes edge functions estão deployed no projeto DEV:

| Função | Status |
|--------|--------|
| `transcribe-audio` | Necessária para áudio no chat |
| `create-chat-for-entrega` | Já deve existir |
| `finalizar-entrega` | Já deve existir |
| `focusnfe-cte` | Já deve existir |
| `focusnfe-mdfe` | Já deve existir |
| Todas as demais | Verificar deploy |

---

## 🔑 Secrets do DEV

Verificar se os secrets do projeto DEV estão configurados iguais aos de produção:

- `FOCUSNFE_TOKEN`
- `OPENAI_API_KEY` (para transcrição de áudio)
- `service_role_key` (no vault, para push notifications)

---

## ✅ Checklist de Execução

- [ ] Backup do banco DEV
- [ ] Trocar Supabase para DEV no Lovable
- [ ] Executar Bloco 1 (agendamento)
- [ ] Executar Bloco 2 (áudio chat)
- [ ] Executar Bloco 3 (financeiro crédito)
- [ ] Executar Bloco 4 (auditoria enriquecida)
- [ ] Executar Bloco 5 (normalização + notificações)
- [ ] Executar Bloco 6 (cargos torre + seeds)
- [ ] Executar Bloco 7 (expiração cargas)
- [ ] Executar Bloco 8 (cancelamento viagem)
- [ ] Executar Bloco 9 (cargos empresa + RLS + seeds)
- [ ] Executar Bloco 10 (rename ADMIN → Administrador)
- [ ] Verificar deploy das edge functions
- [ ] Verificar secrets
- [ ] Testar fluxo completo: criar carga → aceitar → mudar status → verificar notificações e logs
