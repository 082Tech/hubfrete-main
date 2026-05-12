## Objetivo

Tornar a emissão de CT-e e MDF-e **automática e baseada em eventos do motorista**, com canhoto 100% digital e suporte a cancelamento + reemissão de manifesto.

---

## 1. CT-e automático após conferência da NF-e pelo motorista

### Banco — nova estrutura na tabela `entregas`
- `nfes_conferidas_em timestamptz` — quando o motorista confirmou
- `nfes_conferidas_por uuid` — auth.uid do motorista
- `nfes_conferencia_observacao text` — observação opcional ("nota X faltando", etc.)
- `nfes_conferencia_status text` — `'pendente' | 'ok' | 'divergente'`

### Trigger `trg_emitir_cte_apos_conferencia` em `entregas`
Dispara `AFTER UPDATE` quando:
- `nfes_conferencia_status` muda para `'ok'`
- E ainda não existe CT-e para a entrega (`NOT EXISTS (SELECT 1 FROM ctes WHERE entrega_id = NEW.id)`)

Ação: chama a Edge Function `focusnfe-cte` via `pg_net.http_post` com `{action: "emit", entrega_id}`.

### Edge Function `focusnfe-cte` (já existe)
- Mantém a lógica atual de montagem do payload
- Após emissão bem-sucedida, grava CT-e em `ctes` com `focus_status='autorizado'`
- Isso vai disparar a próxima cadeia (MDF-e)

### App do motorista (estrutura pronta para você ajustar depois)
- Tela de coleta passa a ter passo "Confira as NF-es":
  - Lista as NF-es esperadas (já em `nfes` linkadas à entrega)
  - Botão "Notas conferem" → seta `nfes_conferencia_status='ok'`
  - Botão "Há divergência" → abre observação e seta `'divergente'` (não emite CT-e)

---

## 2. MDF-e automático, agrupado por UF de destino

### Banco — adições em `mdfes`
- `uf_origem text`
- `uf_destino text`
- `viagem_id uuid` (se ainda não existe)
- `agrupamento_chave text generated always as (viagem_id::text || '|' || uf_destino) stored` — chave única para evitar MDF-e duplicado por (viagem, UF)
- Índice único parcial: `WHERE focus_status NOT IN ('cancelado', 'erro')`

### Trigger `trg_emitir_mdfe_por_uf` em `ctes`
Dispara `AFTER INSERT OR UPDATE` quando `focus_status = 'autorizado'`.

Lógica:
1. Identifica `viagem_id` e `uf_destino` da entrega (via `entregas → enderecos_carga` tipo='entrega')
2. Conta CT-es autorizados da viagem com a mesma UF de destino
3. Conta CT-es esperados da viagem para essa UF (entregas em `aguardando|saiu_para_coleta|coletado` que ainda não viraram CT-e)
4. Se "esperados restantes = 0" e ainda não há MDF-e ativo para `(viagem_id, uf_destino)` → chama `focusnfe-mdfe` com `{action: "emit", viagem_id, uf_destino}`

### Edge Function `focusnfe-mdfe`
- Adicionar parâmetro `uf_destino` no payload de emissão
- Filtrar CT-es da viagem por UF antes de montar o manifesto
- Salvar `uf_origem`, `uf_destino`, `viagem_id` no registro

### Exemplo concreto (Maceió → 2 AL + 1 PE)
- 3 entregas coletadas e conferidas → 3 CT-es autorizados
- Trigger detecta: 2 com UF=AL, 1 com UF=PE
- Emite 2 MDF-es: um agrupando os 2 CT-es de AL, outro com o CT-e de PE

---

## 3. Canhoto digital (assinatura + GPS, sem upload)

### Banco — adições em `entregas`
- `canhoto_assinatura_base64 text` — imagem PNG da assinatura capturada na tela
- `canhoto_latitude numeric(10,7)`
- `canhoto_longitude numeric(10,7)`
- `canhoto_assinado_em timestamptz`
- `canhoto_dispositivo_info jsonb` — user-agent, accuracy GPS, etc.

`canhoto_url` continua existindo (compatibilidade), mas não é mais obrigatório.

### Atualizar `proteger_finalizacao_viagem`
Trocar a checagem:
```
(canhoto_url IS NOT NULL) OR (canhoto_assinatura_base64 IS NOT NULL AND canhoto_latitude IS NOT NULL)
```

### App do motorista
Estrutura no banco pronta. UI (assinatura touch + captura GPS) você ajusta no app.

---

## 4. Cancelar e reemitir MDF-e

### Edge Function `focusnfe-mdfe` — nova action `recriar`
Sequência atômica:
1. Cancela o MDF-e atual na Focus (action `cancelar` interna)
2. Marca o registro antigo como `focus_status='cancelado'`
3. Emite um novo MDF-e para o mesmo `(viagem_id, uf_destino)`, agora englobando CT-es novos que entraram depois

### UI — botão "Cancelar e reemitir manifesto"
No painel da viagem, ao lado de cada MDF-e ativo, um botão que dispara essa action. Pede motivo (campo `justificativa` exigido pela SEFAZ).

### Regra de segurança
Só permite cancelar MDF-e que **não tenha sido encerrado** (`focus_status` ≠ `'encerrado'`) e dentro da janela de 24h da SEFAZ.

---

## 5. Resumo de arquivos a alterar

### Migrations (1 única migration)
- ALTER `entregas` — colunas de conferência e canhoto digital
- ALTER `mdfes` — uf_origem, uf_destino, viagem_id, agrupamento_chave + índice único
- CREATE FUNCTION `emitir_cte_apos_conferencia` + trigger
- CREATE FUNCTION `emitir_mdfe_por_uf` + trigger
- REPLACE `proteger_finalizacao_viagem` aceitando canhoto digital
- Habilitar `pg_net` se ainda não estiver

### Edge Functions
- `focusnfe-cte`: aceitar invocação por trigger (idempotência via `focus_ref` único)
- `focusnfe-mdfe`: aceitar `uf_destino` no payload, nova action `recriar`

### Frontend
- Painel de viagem: botão "Cancelar e reemitir manifesto" + indicador de UFs e status dos manifestos
- Remover botões manuais de "Gerar CT-e" / "Gerar MDF-e" do painel (vira automático). Manter apenas botão "Reemitir" para troubleshooting.

---

## Detalhes técnicos importantes

- **pg_net** é assíncrono: triggers só agendam o POST, não bloqueiam a transação. Resposta da Focus retorna pelo callback do edge function que grava em `ctes`/`mdfes`.
- **Idempotência**: usar `ref` único `cte_<entrega_id>` e `mdfe_<viagem_id>_<uf>` para evitar emissão duplicada se o trigger disparar duas vezes.
- **Service role**: trigger precisa do `SUPABASE_SERVICE_ROLE_KEY` para chamar Edge Function. Salvo via `app.settings` ou hardcoded no SQL da função (padrão Supabase para pg_net + edge functions).
- **NÃO mexe** em CT-e/MDF-e já emitidos antes desta migration — só atua para frente.
