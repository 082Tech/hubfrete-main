

# Corrigir Merge de Entregas da Mesma Carga

## Contexto

A logica de merge ja existe parcialmente no codigo (`CargasDisponiveis.tsx`, linhas 784-838). Quando o mesmo motorista recebe uma segunda alocacao da mesma carga, o sistema soma o peso na entrega existente em vez de criar uma duplicata. Porem, o filtro atual inclui `saiu_para_entrega` como status "mergeavel", o que esta incorreto segundo sua regra de negocio.

## Problema Atual

```typescript
// Linha 790 - inclui 'saiu_para_entrega' indevidamente
.in('status', ['aguardando', 'saiu_para_coleta', 'saiu_para_entrega'])
```

Quando a entrega ja saiu para entrega, o peso nao deveria ser somado - uma nova entrega deve ser criada.

## Plano de Implementacao

### 1. Corrigir o filtro de status mergeavel (Frontend)

No `CargasDisponiveis.tsx`, remover `saiu_para_entrega` da lista de status que permitem merge:

```typescript
.in('status', ['aguardando', 'saiu_para_coleta'])
```

### 2. Mover a logica de merge para o RPC no banco de dados

Atualmente, o frontend faz a verificacao de entrega existente e o merge manualmente, enquanto o RPC `accept_carga_tx` sempre cria uma entrega nova. Isso e inconsistente e inseguro (race conditions).

A alteracao no RPC `accept_carga_tx` sera:

- **Antes de criar a entrega** (Etapa 3), verificar se ja existe uma entrega do mesmo `carga_id` + `motorista_id` com status `aguardando` ou `saiu_para_coleta`
- Se existir: somar `p_peso_kg` ao `peso_alocado_kg` existente, somar `p_valor_frete`, fazer merge do JSON `carrocerias_alocadas`, e registrar evento de "peso adicional alocado"
- Se nao existir: criar entrega nova normalmente (fluxo atual)
- O retorno incluira um campo `merged: true/false` para o frontend saber o que aconteceu

### 3. Atualizar o frontend para usar o resultado do RPC

No `handleConfirmAccept` / `mutationFn`:

- Remover a logica manual de merge do frontend (linhas 784-838 que verificam `entregaExistente` e fazem UPDATE)
- Confiar no RPC para fazer o merge atomicamente
- Usar o campo `merged` do retorno para exibir toast adequado ("Peso adicionado a entrega existente" vs "Entrega criada com sucesso")

### 4. Feedback visual ao usuario

- Quando o merge acontecer, exibir toast de sucesso diferenciado: "Peso adicionado a entrega existente (ENT-XXXX)"
- Quando criar nova entrega, manter o toast atual

## Detalhes Tecnicos

### Alteracao no RPC (migracao SQL)

```sql
-- Dentro de accept_carga_tx, antes da Etapa 3 (INSERT INTO entregas):

-- Verificar merge: mesma carga + mesmo motorista + status mergeavel
SELECT id, peso_alocado_kg, valor_frete, carrocerias_alocadas, codigo
INTO v_entrega_existente
FROM entregas
WHERE carga_id = p_carga_id
  AND motorista_id = p_motorista_id
  AND status IN ('aguardando', 'saiu_para_coleta')
FOR UPDATE
LIMIT 1;

IF v_entrega_existente.id IS NOT NULL THEN
  -- MERGE: somar peso e valor
  UPDATE entregas SET
    peso_alocado_kg = v_entrega_existente.peso_alocado_kg + p_peso_kg,
    valor_frete = COALESCE(v_entrega_existente.valor_frete, 0) + COALESCE(p_valor_frete, 0),
    carrocerias_alocadas = /* merge JSON logic */,
    updated_at = v_now
  WHERE id = v_entrega_existente.id;

  -- Evento de timeline
  INSERT INTO entrega_eventos (...) VALUES (
    v_entrega_existente.id, 'atualizacao', v_now,
    'Peso adicional alocado (mais ' || p_peso_kg || ' kg)'
  );

  -- Retornar com merged = true (pular criacao de viagem)
  RETURN jsonb_build_object('success', true, 'merged', true, ...);
END IF;

-- Caso contrario, fluxo normal de INSERT continua...
```

### Alteracao no Frontend

- Remover verificacao manual de `entregaExistente` (linhas ~784-838)
- Voltar a usar o RPC `accept_carga_tx` como unica fonte de verdade
- Tratar o retorno `merged: true` para toast diferenciado

## Resumo das Alteracoes

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `accept_carga_tx` (SQL migration) | Migracao | Adicionar logica de merge atomico no RPC |
| `CargasDisponiveis.tsx` | Edicao | Remover merge manual do frontend, usar RPC |

