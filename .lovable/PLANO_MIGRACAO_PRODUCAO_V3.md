# Plano de Migração para Produção — V3

**Data:** 2026-03-31  
**Período coberto:** Migrations de 30/03/2026 a 31/03/2026 (8 arquivos)  
**Pré-requisito:** Plano V2 (24/03) já executado na produção

---

## Resumo Executivo

As alterações deste ciclo focaram em **5 áreas**:
1. **Cargas** — Novos campos de agendamento de entrega
2. **Chat** — Suporte a áudio (upload, transcrição)
3. **Financeiro** — Crédito automático (incremento/decremento) + trigger de baixa
4. **Auditoria** — Trigger genérico de auditoria em 16 tabelas-chave
5. **Operacional** — Normalização de status de entregas + correção da trigger de notificação

---

## ⚠️ IMPORTANTE — Antes de Executar

1. **Faça backup do banco de produção**
2. Execute os blocos na ordem indicada
3. O Bloco 2 cria um **bucket no Storage** — verifique se já não existe
4. O Bloco 4 adiciona triggers de auditoria em **16 tabelas** — pode gerar volume de dados significativo

---

## Bloco 1 — Cargas: Campos de Agendamento

> Origem: `20260330133618`

```sql
ALTER TABLE cargas
  ADD COLUMN IF NOT EXISTS agendamento_entrega boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_agendamento text;
```

**Impacto:** Apenas schema. Colunas com default, sem risco.

---

## Bloco 2 — Chat: Suporte a Áudio

> Origem: `20260330180658` + `20260330182814`

### 2.1 Colunas na tabela `mensagens`

```sql
ALTER TABLE public.mensagens 
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duracao integer;

ALTER TABLE public.mensagens 
  ADD COLUMN IF NOT EXISTS audio_transcricao text;
```

### 2.2 Bucket de Storage para áudios

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-audios', 'chat-audios', true, 10485760, ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;
```

### 2.3 Políticas de Storage

```sql
CREATE POLICY "Authenticated users can upload audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-audios');

CREATE POLICY "Anyone can view chat audios" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-audios');
```

**Impacto:** Cria bucket + políticas no Storage. Verificar se não conflita com políticas existentes.

---

## Bloco 3 — Financeiro: Crédito Automático

> Origem: `20260330180658` (trigger atualizada) + `20260331133345`

### 3.1 Trigger `criar_financeiro_entrega` (versão final)

Agora incrementa `credito_utilizado` no embarcador ao criar o registro financeiro e usa `prazo_dias` da config financeira do embarcador.

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
```

### 3.2 Trigger `ajustar_credito_na_baixa` (NOVA)

Decrementa `credito_utilizado` quando o status de um registro financeiro muda para `pago`.

```sql
CREATE OR REPLACE FUNCTION public.ajustar_credito_na_baixa()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
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

DROP TRIGGER IF EXISTS trg_ajustar_credito_na_baixa ON financeiro_entregas;
CREATE TRIGGER trg_ajustar_credito_na_baixa
  AFTER UPDATE ON financeiro_entregas
  FOR EACH ROW
  EXECUTE FUNCTION ajustar_credito_na_baixa();
```

---

## Bloco 4 — Auditoria: Trigger Genérico

> Origem: `20260331133834` + `20260331134840`

### 4.1 Ajuste de tipo na tabela `auditoria_logs`

```sql
ALTER TABLE auditoria_logs ALTER COLUMN registro_id TYPE text USING registro_id::text;
```

### 4.2 Função de auditoria genérica

```sql
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::text, auth.uid(), NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::text, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::text, auth.uid(), to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;
```

### 4.3 Attach triggers em 16 tabelas

```sql
DO $$
DECLARE
  tbl TEXT;
  tables_to_audit TEXT[] := ARRAY[
    'empresas', 'motoristas', 'veiculos', 'carrocerias',
    'cargas', 'entregas', 'filiais', 'usuarios',
    'usuarios_filiais', 'financeiro_entregas', 'empresa_config_financeira',
    'chats', 'ctes', 'documentos_validacao', 'geofences', 'viagens'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_audit
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
```

### 4.4 Índices de performance

```sql
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_timestamp ON auditoria_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_tabela ON auditoria_logs (tabela);
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_operacao ON auditoria_logs (operacao);
```

**⚠️ ATENÇÃO:** Verifique se a tabela `auditoria_logs` já existe em produção. Se não, será necessário criá-la primeiro (ver Plano V1).

---

## Bloco 5 — Operacional: Normalização de Status + Notificações

> Origem: `20260331181440` + `20260331185642` (versão final)

### 5.1 Trigger de normalização de status de entregas

Converte labels capitalizados para enum válido automaticamente.

```sql
CREATE OR REPLACE FUNCTION normalize_entrega_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  raw_text TEXT;
  normalized TEXT;
BEGIN
  raw_text := NEW.status::text;
  
  normalized := CASE lower(raw_text)
    WHEN 'aguardando' THEN 'aguardando'
    WHEN 'saiu_para_coleta' THEN 'saiu_para_coleta'
    WHEN 'em_transito' THEN 'em_transito'
    WHEN 'saiu_para_entrega' THEN 'saiu_para_entrega'
    WHEN 'entregue' THEN 'entregue'
    WHEN 'cancelada' THEN 'cancelada'
    WHEN 'problema' THEN 'problema'
    ELSE lower(raw_text)
  END;
  
  NEW.status := normalized::status_entrega;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_normalize_entrega_status ON entregas;

CREATE TRIGGER trigger_normalize_entrega_status
  BEFORE INSERT OR UPDATE OF status ON entregas
  FOR EACH ROW
  EXECUTE FUNCTION normalize_entrega_status();
```

### 5.2 Trigger de notificação (versão final corrigida)

Usa join correto `usuarios → usuarios_filiais → filiais` em vez de `u.empresa_id`.

```sql
CREATE OR REPLACE FUNCTION public.notify_entrega_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_carga RECORD;
  v_motorista_nome TEXT;
  v_motorista_empresa_id BIGINT;
  v_status_label TEXT;
  v_empresa_usuario RECORD;
  v_embarcador_usuario RECORD;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT c.codigo, c.empresa_id, c.descricao
  INTO v_carga
  FROM public.cargas c
  WHERE c.id = NEW.carga_id;

  IF NEW.motorista_id IS NOT NULL THEN
    SELECT m.nome_completo, m.empresa_id
    INTO v_motorista_nome, v_motorista_empresa_id
    FROM public.motoristas m
    WHERE m.id = NEW.motorista_id;
  END IF;

  v_status_label := CASE NEW.status::text
    WHEN 'aguardando' THEN 'Aguardando'
    WHEN 'saiu_para_coleta' THEN 'Saiu para Coleta'
    WHEN 'em_transito' THEN 'Em Trânsito'
    WHEN 'saiu_para_entrega' THEN 'Saiu para Entrega'
    WHEN 'entregue' THEN 'Concluída'
    WHEN 'cancelada' THEN 'Cancelada'
    WHEN 'problema' THEN 'Problema'
    ELSE COALESCE(NEW.status::text, 'Atualizada')
  END;

  IF v_motorista_empresa_id IS NOT NULL THEN
    FOR v_empresa_usuario IN
      SELECT DISTINCT u.auth_user_id
      FROM public.usuarios u
      JOIN public.usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN public.filiais f ON f.id = uf.filial_id
      WHERE f.empresa_id = v_motorista_empresa_id
        AND u.auth_user_id IS NOT NULL
    LOOP
      INSERT INTO public.notificacoes (
        user_id, tipo, titulo, mensagem, link, dados
      ) VALUES (
        v_empresa_usuario.auth_user_id,
        'status_entrega_alterado',
        'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
        'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' mudou para ' || v_status_label ||
        CASE WHEN v_motorista_nome IS NOT NULL THEN ' (Motorista: ' || v_motorista_nome || ')' ELSE '' END,
        '/transportadora/operacao',
        jsonb_build_object(
          'entrega_id', NEW.id,
          'carga_id', NEW.carga_id,
          'status', NEW.status::text,
          'codigo', COALESCE(NEW.codigo, v_carga.codigo)
        )
      );
    END LOOP;
  END IF;

  IF v_carga.empresa_id IS NOT NULL THEN
    FOR v_embarcador_usuario IN
      SELECT DISTINCT u.auth_user_id
      FROM public.usuarios u
      JOIN public.usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN public.filiais f ON f.id = uf.filial_id
      WHERE f.empresa_id = v_carga.empresa_id
        AND u.auth_user_id IS NOT NULL
    LOOP
      INSERT INTO public.notificacoes (
        user_id, tipo, titulo, mensagem, link, dados
      ) VALUES (
        v_embarcador_usuario.auth_user_id,
        'status_entrega_alterado',
        'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
        'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' está agora com status: ' || v_status_label ||
        CASE WHEN v_motorista_nome IS NOT NULL THEN '. Motorista: ' || v_motorista_nome ELSE '' END,
        '/embarcador/cargas',
        jsonb_build_object(
          'entrega_id', NEW.id,
          'carga_id', NEW.carga_id,
          'status', NEW.status::text,
          'codigo', COALESCE(NEW.codigo, v_carga.codigo)
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
```

---

## Bloco 6 — Edge Functions

Nenhuma edge function nova foi criada neste ciclo. As seguintes já existem e devem ser verificadas se estão deployed em produção:

- `transcribe-audio` — usada pelo novo recurso de áudio no chat (se não existir em produção, fazer deploy)

---

## Edge Functions a Verificar no Deploy

| Função | Alteração | Ação |
|--------|-----------|------|
| `transcribe-audio` | Pode ser nova em produção | Verificar deploy |
| Demais funções | Sem alterações neste ciclo | Nenhuma |

---

## Checklist de Execução

- [ ] Backup do banco de produção
- [ ] Executar Bloco 1 (agendamento)
- [ ] Executar Bloco 2 (áudio chat + bucket)
- [ ] Executar Bloco 3 (financeiro crédito)
- [ ] Executar Bloco 4 (auditoria) — verificar se `auditoria_logs` existe
- [ ] Executar Bloco 5 (normalização status + notificações)
- [ ] Verificar deploy da edge function `transcribe-audio`
- [ ] Testar mudança de status de uma entrega
- [ ] Verificar notificações recebidas
- [ ] Verificar logs de auditoria
