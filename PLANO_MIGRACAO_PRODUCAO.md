# 🔄 Plano de Migração DEV → PRODUÇÃO

**Período**: 24/02/2026 – 05/03/2026  
**Gerado em**: 05/03/2026  
**Ambiente DEV**: `ublyithvarvtqbwmxtyh` (hubfrete-develop)  
**Ambiente PROD**: `eilwdavgnuhfyxfqkvrk` (hubfrete)

> ⚠️ Este arquivo é regenerado a cada ciclo de atualização. Executar os SQLs abaixo **no banco de PRODUÇÃO** na ordem apresentada.

---

## 📋 Resumo das Alterações

| Categoria | Qtd |
|---|---|
| Novas colunas em tabelas existentes | 6 |
| Alteração de tipo de coluna | 4 |
| Remoção de colunas | 3 |
| Alteração de ENUM | 1 |
| Functions (CREATE/REPLACE) | 5 |
| Functions (DROP overloads) | 3 |
| Triggers | 3 |
| Migração de dados (códigos) | 1 |

---

## 1️⃣ COLUNAS — Novas

```sql
-- entregas: previsão de coleta
ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS previsao_coleta TIMESTAMP WITH TIME ZONE;

-- entregas: outros documentos (JSON array)
ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS outros_documentos JSONB DEFAULT '[]'::jsonb;

-- carrocerias: vínculo com veículo
ALTER TABLE public.carrocerias
  ADD COLUMN IF NOT EXISTS veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_carrocerias_veiculo_id ON public.carrocerias(veiculo_id);

-- veiculos: motorista padrão
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS motorista_padrao_id UUID REFERENCES public.motoristas(id);

-- config_fiscal: regime tributário e base de cálculo ICMS (se não existirem)
ALTER TABLE public.config_fiscal
  ADD COLUMN IF NOT EXISTS regime_tributario_emitente INTEGER NOT NULL DEFAULT 3;
ALTER TABLE public.config_fiscal
  ADD COLUMN IF NOT EXISTS icms_base_calculo_percentual NUMERIC(5,2) NOT NULL DEFAULT 100.00;

COMMENT ON COLUMN public.config_fiscal.regime_tributario_emitente
  IS '1 = Simples Nacional, 3 = Regime Normal';
COMMENT ON COLUMN public.config_fiscal.icms_base_calculo_percentual
  IS 'Percentual da base de calculo do ICMS (ex: 100.00 = base integral)';
```

---

## 2️⃣ COLUNAS — Alteração de Tipo (INTEGER → NUMERIC)

```sql
ALTER TABLE public.cargas
  ALTER COLUMN peso_kg TYPE NUMERIC(12,4),
  ALTER COLUMN peso_disponivel_kg TYPE NUMERIC(12,4),
  ALTER COLUMN peso_minimo_fracionado_kg TYPE NUMERIC(12,4);

ALTER TABLE public.entregas
  ALTER COLUMN peso_alocado_kg TYPE NUMERIC(12,4);

ALTER TABLE public.carrocerias
  ALTER COLUMN capacidade_kg TYPE NUMERIC(12,4);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'veiculos' AND column_name = 'capacidade_kg'
  ) THEN
    EXECUTE 'ALTER TABLE public.veiculos ALTER COLUMN capacidade_kg TYPE NUMERIC(12,4)';
  END IF;
END $$;
```

---

## 3️⃣ COLUNAS — Remoção (vínculos permanentes eliminados)

> ⚠️ **VERIFICAR DADOS EXISTENTES NA PRODUÇÃO** antes de executar. Se houver dados nestas colunas que precisam ser preservados, exportar antes.

```sql
-- Migrar dados existentes antes de remover
UPDATE public.veiculos 
SET motorista_padrao_id = motorista_id 
WHERE motorista_id IS NOT NULL AND motorista_padrao_id IS NULL;

-- Remover vínculos fixos motorista↔veículo↔carroceria
ALTER TABLE public.veiculos DROP COLUMN IF EXISTS motorista_id;
ALTER TABLE public.veiculos DROP COLUMN IF EXISTS carroceria_id;
ALTER TABLE public.carrocerias DROP COLUMN IF EXISTS motorista_id;
```

---

## 4️⃣ ENUM — Remover 'terceirizado' de tipo_cadastro_motorista

> ⚠️ Verificar se existem registros com `tipo_cadastro = 'terceirizado'` na produção. Se sim, converter para 'autonomo' antes.

```sql
-- Converter registros existentes se houver
UPDATE public.motoristas SET tipo_cadastro = 'autonomo' WHERE tipo_cadastro = 'terceirizado';
UPDATE public.ajudantes SET tipo_cadastro = 'autonomo' WHERE tipo_cadastro = 'terceirizado';

-- Drop defaults antes de alterar enum
ALTER TABLE ajudantes ALTER COLUMN tipo_cadastro DROP DEFAULT;
ALTER TABLE motoristas ALTER COLUMN tipo_cadastro DROP DEFAULT;

-- Recriar enum sem terceirizado
ALTER TYPE tipo_cadastro_motorista RENAME TO tipo_cadastro_motorista_old;
CREATE TYPE tipo_cadastro_motorista AS ENUM ('frota', 'autonomo');

ALTER TABLE motoristas 
  ALTER COLUMN tipo_cadastro TYPE tipo_cadastro_motorista 
  USING tipo_cadastro::text::tipo_cadastro_motorista;

ALTER TABLE ajudantes 
  ALTER COLUMN tipo_cadastro TYPE tipo_cadastro_motorista 
  USING tipo_cadastro::text::tipo_cadastro_motorista;

DROP TYPE tipo_cadastro_motorista_old;

-- Restaurar defaults
ALTER TABLE ajudantes ALTER COLUMN tipo_cadastro SET DEFAULT 'autonomo'::tipo_cadastro_motorista;
ALTER TABLE motoristas ALTER COLUMN tipo_cadastro SET DEFAULT 'frota'::tipo_cadastro_motorista;
```

---

## 5️⃣ FUNCTIONS — Drop overloads antigos

```sql
DROP FUNCTION IF EXISTS public.accept_carga_tx(uuid, uuid, uuid, uuid, numeric, numeric, uuid, text);
DROP FUNCTION IF EXISTS public.accept_carga_tx(uuid, uuid, uuid, uuid, integer, numeric, uuid, text, timestamptz, jsonb);
DROP FUNCTION IF EXISTS public.accept_carga_tx(uuid, uuid, uuid, uuid, numeric, numeric, uuid, text, timestamptz, jsonb);
```

---

## 6️⃣ FUNCTIONS — accept_carga_tx (versão final com validação de equipamento)

```sql
CREATE OR REPLACE FUNCTION public.accept_carga_tx(
  p_carga_id UUID,
  p_motorista_id UUID,
  p_veiculo_id UUID,
  p_carroceria_id UUID,
  p_peso_kg NUMERIC,
  p_valor_frete NUMERIC,
  p_viagem_id UUID,
  p_user_name TEXT,
  p_previsao_coleta TIMESTAMPTZ DEFAULT NULL,
  p_carrocerias_alocadas JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carga RECORD;
  v_peso_disponivel NUMERIC;
  v_novo_peso_disponivel NUMERIC;
  v_novo_status status_carga;
  v_entrega_id UUID;
  v_entrega_codigo TEXT;
  v_viagem_id UUID;
  v_viagem_criada BOOLEAN := FALSE;
  v_nova_ordem INTEGER;
  v_caller_id UUID;
  v_now TIMESTAMPTZ;
  v_viagem_status TEXT;
  v_existing RECORD;
  v_merged_carrocerias JSONB;
  v_existing_arr JSONB;
  v_new_arr JSONB;
  v_item JSONB;
  v_found BOOLEAN;
  v_idx INTEGER;
  v_conflicting_viagem TEXT;
BEGIN
  v_caller_id := auth.uid();
  v_now := NOW();

  -- ETAPA 0: Validar equipamento não em viagem ativa com outro motorista
  IF p_veiculo_id IS NOT NULL THEN
    SELECT v.codigo INTO v_conflicting_viagem
    FROM viagens v
    WHERE v.veiculo_id = p_veiculo_id
      AND v.motorista_id != p_motorista_id
      AND v.status IN ('aguardando', 'programada', 'em_andamento')
    LIMIT 1;

    IF v_conflicting_viagem IS NOT NULL THEN
      RAISE EXCEPTION 'VEICULO_EM_USO: veículo já está na viagem % com outro motorista', v_conflicting_viagem;
    END IF;
  END IF;

  IF p_carrocerias_alocadas IS NOT NULL AND jsonb_array_length(p_carrocerias_alocadas) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_carrocerias_alocadas)
    LOOP
      SELECT v.codigo INTO v_conflicting_viagem
      FROM viagens v
      WHERE v.status IN ('aguardando', 'programada', 'em_andamento')
        AND v.motorista_id != p_motorista_id
        AND (
          v.carroceria_id = (v_item->>'carroceria_id')::uuid
          OR EXISTS (
            SELECT 1 FROM entregas e
            JOIN viagem_entregas ve ON ve.entrega_id = e.id
            WHERE ve.viagem_id = v.id
              AND e.carrocerias_alocadas @> jsonb_build_array(jsonb_build_object('carroceria_id', v_item->>'carroceria_id'))
          )
        )
      LIMIT 1;

      IF v_conflicting_viagem IS NOT NULL THEN
        RAISE EXCEPTION 'CARROCERIA_EM_USO: carroceria já está na viagem % com outro motorista', v_conflicting_viagem;
      END IF;
    END LOOP;
  END IF;

  IF p_carroceria_id IS NOT NULL THEN
    SELECT v.codigo INTO v_conflicting_viagem
    FROM viagens v
    WHERE v.carroceria_id = p_carroceria_id
      AND v.motorista_id != p_motorista_id
      AND v.status IN ('aguardando', 'programada', 'em_andamento')
    LIMIT 1;

    IF v_conflicting_viagem IS NOT NULL THEN
      RAISE EXCEPTION 'CARROCERIA_EM_USO: carroceria já está na viagem % com outro motorista', v_conflicting_viagem;
    END IF;
  END IF;

  -- ETAPA 1: Lock + Validação da Carga
  SELECT * INTO v_carga
  FROM cargas
  WHERE id = p_carga_id
  FOR UPDATE;

  IF v_carga.id IS NULL THEN
    RAISE EXCEPTION 'CARGA_NAO_ENCONTRADA';
  END IF;

  IF v_carga.status NOT IN ('publicada', 'parcialmente_alocada') THEN
    RAISE EXCEPTION 'CARGA_NAO_DISPONIVEL: status atual é %', v_carga.status;
  END IF;

  -- ETAPA 2: Abate Peso
  v_peso_disponivel := COALESCE(v_carga.peso_disponivel_kg, v_carga.peso_kg);
  v_novo_peso_disponivel := v_peso_disponivel - p_peso_kg;

  IF v_novo_peso_disponivel < 0 THEN
    RAISE EXCEPTION 'PESO_EXCEDE_DISPONIVEL: solicitado=% disponivel=%', p_peso_kg, v_peso_disponivel;
  END IF;

  IF v_novo_peso_disponivel <= 0 THEN
    v_novo_status := 'totalmente_alocada'::status_carga;
  ELSE
    v_novo_status := 'parcialmente_alocada'::status_carga;
  END IF;

  UPDATE cargas
  SET peso_disponivel_kg = GREATEST(0, v_novo_peso_disponivel),
      status = v_novo_status,
      updated_at = v_now
  WHERE id = p_carga_id;

  -- ETAPA 2.5: MERGE — mesma carga + mesmo motorista
  SELECT id, peso_alocado_kg, valor_frete, carrocerias_alocadas, codigo
  INTO v_existing
  FROM entregas
  WHERE carga_id = p_carga_id
    AND motorista_id = p_motorista_id
    AND status IN ('aguardando', 'saiu_para_coleta')
  FOR UPDATE
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    v_existing_arr := COALESCE(v_existing.carrocerias_alocadas, '[]'::jsonb);
    v_new_arr := COALESCE(p_carrocerias_alocadas, '[]'::jsonb);
    v_merged_carrocerias := v_existing_arr;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_new_arr)
    LOOP
      v_found := FALSE;
      FOR v_idx IN 0..jsonb_array_length(v_merged_carrocerias) - 1
      LOOP
        IF v_merged_carrocerias->v_idx->>'carroceria_id' = v_item->>'carroceria_id' THEN
          v_merged_carrocerias := jsonb_set(
            v_merged_carrocerias,
            ARRAY[v_idx::text, 'peso_kg'],
            to_jsonb(
              COALESCE((v_merged_carrocerias->v_idx->>'peso_kg')::numeric, 0) +
              COALESCE((v_item->>'peso_kg')::numeric, 0)
            )
          );
          v_found := TRUE;
          EXIT;
        END IF;
      END LOOP;

      IF NOT v_found THEN
        v_merged_carrocerias := v_merged_carrocerias || jsonb_build_array(v_item);
      END IF;
    END LOOP;

    UPDATE entregas SET
      peso_alocado_kg = COALESCE(v_existing.peso_alocado_kg, 0) + p_peso_kg,
      valor_frete = COALESCE(v_existing.valor_frete, 0) + COALESCE(p_valor_frete, 0),
      carrocerias_alocadas = CASE 
        WHEN jsonb_array_length(v_merged_carrocerias) > 0 THEN v_merged_carrocerias 
        ELSE NULL 
      END,
      updated_at = v_now
    WHERE id = v_existing.id;

    INSERT INTO entrega_eventos (
      entrega_id, tipo, timestamp, observacao, user_id, user_nome
    ) VALUES (
      v_existing.id, 'atualizacao', v_now,
      'Peso adicional alocado (mais ' || ROUND(p_peso_kg, 4) || ' kg)',
      v_caller_id, p_user_name
    );

    RETURN jsonb_build_object(
      'success', TRUE,
      'merged', TRUE,
      'entrega_id', v_existing.id,
      'entrega_codigo', v_existing.codigo,
      'carga_status', v_novo_status,
      'peso_disponivel_restante', GREATEST(0, v_novo_peso_disponivel),
      'mensagem', 'Peso adicionado à entrega existente (' || COALESCE(v_existing.codigo, v_existing.id::text) || ')'
    );
  END IF;

  -- ETAPA 3: Criar Entrega
  INSERT INTO entregas (
    carga_id, motorista_id, veiculo_id, carroceria_id,
    peso_alocado_kg, valor_frete, status,
    created_by, updated_by, previsao_coleta, carrocerias_alocadas
  ) VALUES (
    p_carga_id, p_motorista_id, p_veiculo_id, p_carroceria_id,
    p_peso_kg, p_valor_frete, 'aguardando'::status_entrega,
    v_caller_id, v_caller_id, p_previsao_coleta, p_carrocerias_alocadas
  )
  RETURNING id, codigo INTO v_entrega_id, v_entrega_codigo;

  -- ETAPA 4: Eventos
  INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_id, user_nome)
  VALUES (v_entrega_id, 'criado', v_now, 'Carga criada', v_caller_id, p_user_name);

  INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_id, user_nome)
  VALUES (v_entrega_id, 'aceite', v_now + INTERVAL '1 millisecond', 'Status inicial definido automaticamente', NULL, 'Sistema');

  -- ETAPA 5: Viagem
  IF p_viagem_id IS NOT NULL THEN
    SELECT status INTO v_viagem_status FROM viagens WHERE id = p_viagem_id FOR UPDATE;
    IF v_viagem_status IS NULL THEN
      p_viagem_id := NULL;
    ELSIF v_viagem_status IN ('finalizada', 'cancelada') THEN
      p_viagem_id := NULL;
    END IF;
  END IF;

  IF p_viagem_id IS NULL THEN
    INSERT INTO viagens (motorista_id, veiculo_id, carroceria_id, status, started_at, codigo)
    VALUES (p_motorista_id, p_veiculo_id, p_carroceria_id, 'aguardando', v_now, '')
    RETURNING id INTO v_viagem_id;
    v_viagem_criada := TRUE;
    INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem) VALUES (v_viagem_id, v_entrega_id, 1);
  ELSE
    v_viagem_id := p_viagem_id;
    SELECT COALESCE(MAX(ordem), 0) + 1 INTO v_nova_ordem FROM viagem_entregas WHERE viagem_id = p_viagem_id;
    INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem) VALUES (p_viagem_id, v_entrega_id, v_nova_ordem);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'merged', FALSE,
    'entrega_id', v_entrega_id,
    'entrega_codigo', v_entrega_codigo,
    'viagem_id', v_viagem_id,
    'viagem_criada', v_viagem_criada,
    'carga_status', v_novo_status,
    'peso_disponivel_restante', GREATEST(0, v_novo_peso_disponivel),
    'mensagem', 'Carga aceita com sucesso!'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
```

---

## 7️⃣ FUNCTIONS — aceitar_carga_v8 (terminologia atualizada)

```sql
CREATE OR REPLACE FUNCTION public.aceitar_carga_v8(
  p_carga_id UUID,
  p_motorista_id UUID,
  p_veiculo_id UUID,
  p_carroceria_id UUID DEFAULT NULL,
  p_peso_kg NUMERIC DEFAULT NULL,
  p_valor_frete NUMERIC DEFAULT NULL,
  p_previsao_coleta TIMESTAMPTZ DEFAULT NULL,
  p_viagem_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT 'Sistema',
  p_carrocerias_alocadas JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_carga RECORD;
  v_caller_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_novo_peso_disponivel NUMERIC;
  v_novo_status status_carga;
  v_entrega_id UUID;
  v_entrega_codigo TEXT;
  v_viagem_id UUID;
  v_viagem_criada BOOLEAN := FALSE;
  v_viagem_status TEXT;
  v_nova_ordem INT;
BEGIN
  v_caller_id := auth.uid();

  SELECT id, peso_kg, peso_disponivel_kg, status, permite_fracionado
  INTO v_carga
  FROM cargas
  WHERE id = p_carga_id
  FOR UPDATE;

  IF v_carga IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Oferta não encontrada');
  END IF;

  IF v_carga.status NOT IN ('publicada', 'parcialmente_aceita') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Oferta não está disponível para aceite');
  END IF;

  IF p_peso_kg IS NULL THEN
    p_peso_kg := v_carga.peso_disponivel_kg;
  END IF;

  IF p_peso_kg > v_carga.peso_disponivel_kg THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Peso solicitado excede o disponível');
  END IF;

  v_novo_peso_disponivel := v_carga.peso_disponivel_kg - p_peso_kg;

  IF v_novo_peso_disponivel <= 0 OR NOT COALESCE(v_carga.permite_fracionado, TRUE) THEN
    v_novo_status := 'aceita';
    v_novo_peso_disponivel := 0;
  ELSE
    v_novo_status := 'parcialmente_aceita';
  END IF;

  UPDATE cargas SET
    peso_disponivel_kg = v_novo_peso_disponivel,
    status = v_novo_status,
    updated_at = v_now
  WHERE id = p_carga_id;

  INSERT INTO entregas (
    carga_id, motorista_id, veiculo_id, carroceria_id,
    peso_alocado_kg, valor_frete, status,
    created_by, updated_by, previsao_coleta, carrocerias_alocadas
  ) VALUES (
    p_carga_id, p_motorista_id, p_veiculo_id, p_carroceria_id,
    p_peso_kg, p_valor_frete, 'aguardando'::status_entrega,
    v_caller_id, v_caller_id, p_previsao_coleta, p_carrocerias_alocadas
  )
  RETURNING id, codigo INTO v_entrega_id, v_entrega_codigo;

  INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_id, user_nome)
  VALUES (v_entrega_id, 'criado', v_now, 'Carga criada', v_caller_id, p_user_name);

  INSERT INTO entrega_eventos (entrega_id, tipo, timestamp, observacao, user_id, user_nome)
  VALUES (v_entrega_id, 'aceite', v_now + INTERVAL '1 millisecond', 'Status inicial definido automaticamente', NULL, 'Sistema');

  IF p_viagem_id IS NOT NULL THEN
    SELECT status INTO v_viagem_status FROM viagens WHERE id = p_viagem_id FOR UPDATE;
    IF v_viagem_status IS NULL THEN
      p_viagem_id := NULL;
    ELSIF v_viagem_status NOT IN ('planejada', 'em_andamento') THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Viagem não está ativa');
    END IF;
  END IF;

  IF p_viagem_id IS NULL THEN
    INSERT INTO viagens (motorista_id, status, created_at)
    VALUES (p_motorista_id, 'planejada', v_now)
    RETURNING id INTO v_viagem_id;
    v_viagem_criada := TRUE;

    INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem)
    VALUES (v_viagem_id, v_entrega_id, 1);
  ELSE
    v_viagem_id := p_viagem_id;

    SELECT COALESCE(MAX(ordem), 0) + 1
    INTO v_nova_ordem
    FROM viagem_entregas
    WHERE viagem_id = p_viagem_id;

    INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem)
    VALUES (p_viagem_id, v_entrega_id, v_nova_ordem);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'entrega_id', v_entrega_id,
    'entrega_codigo', v_entrega_codigo,
    'viagem_id', v_viagem_id,
    'viagem_criada', v_viagem_criada,
    'novo_status_carga', v_novo_status::text,
    'peso_disponivel', v_novo_peso_disponivel
  );
END;
$function$;
```

---

## 8️⃣ TRIGGERS — Geradores de Código (OFR- e -C)

> ⚠️ Esta seção inclui migração de dados existentes. Os códigos CRG-* serão renomeados para OFR-* e sufixos -EXX para -CXX.

```sql
-- 1. Trigger: gerar código de carga com prefixo OFR-
CREATE OR REPLACE FUNCTION public.generate_carga_codigo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ano TEXT;
  sequencia INTEGER;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    ano := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COALESCE(MAX(
      GREATEST(
        COALESCE(CAST(NULLIF(SUBSTRING(codigo FROM 'OFR-' || ano || '-(\d+)'), '') AS INTEGER), 0),
        COALESCE(CAST(NULLIF(SUBSTRING(codigo FROM 'CRG-' || ano || '-(\d+)'), '') AS INTEGER), 0)
      )
    ), 0) + 1
    INTO sequencia
    FROM public.cargas
    WHERE codigo LIKE 'OFR-' || ano || '-%' OR codigo LIKE 'CRG-' || ano || '-%';
    
    NEW.codigo := 'OFR-' || ano || '-' || LPAD(sequencia::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Trigger: gerar código de entrega com sufixo -C
CREATE OR REPLACE FUNCTION public.generate_entrega_codigo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  carga_codigo TEXT;
  sequencia INTEGER;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT codigo INTO carga_codigo FROM public.cargas WHERE id = NEW.carga_id;
    
    IF carga_codigo IS NOT NULL THEN
      SELECT COUNT(*) + 1 INTO sequencia 
      FROM public.entregas 
      WHERE carga_id = NEW.carga_id AND id != NEW.id;
      
      NEW.codigo := carga_codigo || '-C' || LPAD(sequencia::TEXT, 2, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Migrar códigos existentes: CRG- → OFR- nas cargas
UPDATE public.cargas
SET codigo = REPLACE(codigo, 'CRG-', 'OFR-')
WHERE codigo LIKE 'CRG-%';

-- 4. Migrar códigos existentes nas entregas: CRG- → OFR- e -E → -C
UPDATE public.entregas
SET codigo = REGEXP_REPLACE(
  REPLACE(codigo, 'CRG-', 'OFR-'),
  '-E(\d+)$',
  '-C\1'
)
WHERE codigo LIKE 'CRG-%' OR codigo LIKE '%-E%';
```

---

## 9️⃣ TRIGGERS — notify_entrega_status_change (versão final)

```sql
CREATE OR REPLACE FUNCTION public.notify_entrega_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_carga RECORD;
  v_motorista_nome TEXT;
  v_status_label TEXT;
  v_empresa_usuario RECORD;
  v_embarcador_usuario RECORD;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT c.codigo, c.empresa_id, c.descricao
  INTO v_carga
  FROM public.cargas c
  WHERE c.id = NEW.carga_id;

  IF NEW.motorista_id IS NOT NULL THEN
    SELECT m.nome_completo INTO v_motorista_nome
    FROM public.motoristas m
    WHERE m.id = NEW.motorista_id;
  END IF;

  v_status_label := CASE NEW.status
    WHEN 'aguardando' THEN 'Aguardando'
    WHEN 'saiu_para_coleta' THEN 'Saiu para Coleta'
    WHEN 'saiu_para_entrega' THEN 'Saiu para Entrega'
    WHEN 'entregue' THEN 'Concluída'
    WHEN 'cancelada' THEN 'Cancelada'
    ELSE NEW.status
  END;

  FOR v_empresa_usuario IN
    SELECT u.auth_user_id
    FROM public.usuarios u
    JOIN public.motoristas m ON m.empresa_id = u.empresa_id
    WHERE m.id = NEW.motorista_id
      AND u.auth_user_id IS NOT NULL
  LOOP
    INSERT INTO public.notificacoes (
      user_id, tipo, titulo, mensagem, link, metadata
    ) VALUES (
      v_empresa_usuario.auth_user_id,
      'status_carga',
      'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
      'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' mudou para ' || v_status_label ||
      CASE WHEN v_motorista_nome IS NOT NULL THEN ' (Motorista: ' || v_motorista_nome || ')' ELSE '' END,
      '/transportadora/operacao',
      jsonb_build_object(
        'entrega_id', NEW.id,
        'carga_id', NEW.carga_id,
        'status', NEW.status,
        'codigo', COALESCE(NEW.codigo, v_carga.codigo)
      )
    );
  END LOOP;

  IF v_carga.empresa_id IS NOT NULL THEN
    FOR v_embarcador_usuario IN
      SELECT u.auth_user_id
      FROM public.usuarios u
      WHERE u.empresa_id = v_carga.empresa_id
        AND u.auth_user_id IS NOT NULL
    LOOP
      INSERT INTO public.notificacoes (
        user_id, tipo, titulo, mensagem, link, metadata
      ) VALUES (
        v_embarcador_usuario.auth_user_id,
        'status_carga',
        'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
        'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' está agora com status: ' || v_status_label ||
        CASE WHEN v_motorista_nome IS NOT NULL THEN '. Motorista: ' || v_motorista_nome ELSE '' END,
        '/embarcador/cargas',
        jsonb_build_object(
          'entrega_id', NEW.id,
          'carga_id', NEW.carga_id,
          'status', NEW.status,
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

## 🔟 TRIGGERS — proteger_finalizacao_viagem (atualizada)

```sql
CREATE OR REPLACE FUNCTION public.proteger_finalizacao_viagem()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entregas_pendentes INT;
  v_entrega_sem_canhoto TEXT[];
  v_entrega_sem_nfe TEXT[];
  v_entrega_sem_cte TEXT[];
  v_sem_manifesto BOOLEAN;
BEGIN
  IF NEW.status = 'finalizada' AND (OLD.status IS NULL OR OLD.status != 'finalizada') THEN
    
    SELECT COUNT(*) INTO v_entregas_pendentes
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status NOT IN ('entregue', 'cancelada');
    
    IF v_entregas_pendentes > 0 THEN
      RAISE EXCEPTION 'VIAGEM_COM_ENTREGAS_PENDENTES: % entrega(s) ainda não finalizada(s)', v_entregas_pendentes;
    END IF;

    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text)) INTO v_entrega_sem_canhoto
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status = 'entregue'
      AND (e.canhoto_url IS NULL OR e.canhoto_url = '');

    IF v_entrega_sem_canhoto IS NOT NULL AND array_length(v_entrega_sem_canhoto, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_CANHOTO: Entrega(s) sem canhoto: %', array_to_string(v_entrega_sem_canhoto, ', ');
    END IF;

    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text)) INTO v_entrega_sem_nfe
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status = 'entregue'
      AND NOT EXISTS (SELECT 1 FROM nfes n WHERE n.entrega_id = e.id);

    IF v_entrega_sem_nfe IS NOT NULL AND array_length(v_entrega_sem_nfe, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_NFE: Entrega(s) sem nota fiscal: %', array_to_string(v_entrega_sem_nfe, ', ');
    END IF;

    SELECT ARRAY_AGG(COALESCE(e.codigo, e.id::text)) INTO v_entrega_sem_cte
    FROM viagem_entregas ve
    JOIN entregas e ON e.id = ve.entrega_id
    WHERE ve.viagem_id = NEW.id
      AND e.status = 'entregue'
      AND NOT EXISTS (SELECT 1 FROM ctes c WHERE c.entrega_id = e.id);

    IF v_entrega_sem_cte IS NOT NULL AND array_length(v_entrega_sem_cte, 1) > 0 THEN
      RAISE EXCEPTION 'VIAGEM_ENTREGA_SEM_CTE: Entrega(s) sem CT-e: %', array_to_string(v_entrega_sem_cte, ', ');
    END IF;

    SELECT NOT EXISTS (
      SELECT 1 FROM mdfes m WHERE m.viagem_id = NEW.id
    ) INTO v_sem_manifesto;

    IF v_sem_manifesto THEN
      RAISE EXCEPTION 'VIAGEM_SEM_MANIFESTO: A viagem não possui nenhum MDF-e (Manifesto) anexado';
    END IF;

  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_proteger_finalizacao_viagem ON public.viagens;
CREATE TRIGGER trg_proteger_finalizacao_viagem
  BEFORE UPDATE ON public.viagens
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_finalizacao_viagem();
```

---

## 📦 ORDEM DE EXECUÇÃO

Execute os blocos SQL na seguinte ordem no SQL Editor da produção:

1. **Seção 1** — Novas colunas
2. **Seção 2** — Alteração de tipo (INTEGER → NUMERIC)
3. **Seção 3** — Remoção de colunas *(migrar dados + remover)*
4. **Seção 4** — Alteração de ENUM *(verificar dados antes!)*
5. **Seção 5** — Drop overloads antigos
6. **Seção 6** — accept_carga_tx (versão final)
7. **Seção 7** — aceitar_carga_v8 (terminologia atualizada)
8. **Seção 8** — Triggers de código (OFR-/-C) + migração de dados
9. **Seção 9** — notify_entrega_status_change (versão final)
10. **Seção 10** — Trigger proteger_finalizacao_viagem

---

## ⚠️ Notas Importantes

- **Seção 3 (remoção de colunas)**: Os dados de `veiculos.motorista_id` serão migrados para `motorista_padrao_id` antes da remoção.
- **Seção 4 (enum)**: Se existirem motoristas/ajudantes com `tipo_cadastro = 'terceirizado'` na produção, o UPDATE os converterá para `'autonomo'` automaticamente.
- **Seção 8 (códigos)**: Todos os códigos `CRG-*` serão renomeados para `OFR-*` e sufixos `-EXX` para `-CXX`. Isso afeta exibição mas não integridade referencial.
- **Seção 9 (notificações)**: A função agora usa `metadata` (jsonb) em vez de `dados`, e os links apontam para `/transportadora/operacao` e `/embarcador/cargas`. Verificar se a tabela `notificacoes` já possui a coluna `metadata` na produção.
- **Deploy de Edge Functions**: Após aplicar o SQL, publicar o app para que as edge functions atualizadas sejam deployed automaticamente.
