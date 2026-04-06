

## Diagnóstico dos Logs Atuais

**O que temos hoje:**
- Trigger genérico (`fn_audit_trigger`) que salva `to_jsonb(OLD)` / `to_jsonb(NEW)` para 16 tabelas
- UI mostra: UUID do usuário truncado, nome técnico da tabela, campos alterados como badges com nome da coluna do banco (`peso_kg`, `status`, `empresa_id`)
- Detalhe: JSON bruto lado a lado

**O que falta para um sistema desse nível:**
1. **Nome do usuário** em vez de UUID — não dá para saber quem fez a ação
2. **Descrição legível da ação** — ex: "Alterou status da entrega ENT-042 de 'aguardando' para 'em_transito'" em vez de "UPDATE na tabela entregas, campo status"
3. **Código do registro** — mostrar `VGM-005` ou `ENT-042` em vez de UUID
4. **Labels dos campos em português** — `peso_kg` → "Peso (kg)", `status` → "Status"
5. **Valores formatados no diff** — mostrar "antes: Aguardando → depois: Em Trânsito" em vez de JSON cru
6. **Filtro por usuário** (dropdown com nomes)
7. **IP / User-Agent** para rastreabilidade de segurança

---

## Plano de Implementação

### 1. Enriquecer o trigger com contexto (Migration SQL)

Adicionar colunas à tabela `auditoria_logs`:
- `usuario_nome` (text) — preenchido pelo trigger via lookup em `usuarios` ou `torre_users`
- `registro_codigo` (text) — preenchido pelo trigger pegando o campo `codigo` do registro (se existir)
- `ip_address` (text) — via `current_setting('request.headers', true)` do PostgREST
- `descricao` (text) — frase legível gerada pelo trigger

Atualizar `fn_audit_trigger` para:
```text
1. Buscar nome do usuário (usuarios.nome WHERE auth_user_id = auth.uid())
2. Extrair codigo do registro (NEW.codigo ou OLD.codigo se existir)
3. Extrair IP do header X-Forwarded-For
4. Gerar descrição automática baseada na tabela + operação + campos alterados
```

### 2. Mapeamento de campos legíveis (Frontend)

Criar um dicionário `fieldLabels` por tabela no frontend:
```text
entregas.status → "Status"
entregas.motorista_id → "Motorista"
cargas.peso_kg → "Peso (kg)"
viagens.rota_planejada_polyline → "Rota Planejada"
empresas.nome_fantasia → "Nome Fantasia"
...
```

E um mapeamento de valores de enum:
```text
aguardando → "Aguardando"
em_transito → "Em Trânsito"
finalizada → "Finalizada"
...
```

### 3. Reformular a UI dos Logs (Logs.tsx)

**Lista principal:**
- Coluna "Usuário": mostrar `usuario_nome` (nome real) em vez de UUID
- Coluna "Registro": mostrar `registro_codigo` (ex: ENT-042) com o UUID como tooltip
- Coluna "Resumo": frase curta gerada (ex: "Atualizou status para Em Trânsito")
- Manter filtros existentes + adicionar filtro por usuário (dropdown)

**Dialog de detalhes:**
- Seção de cabeçalho: nome do usuário, IP, data/hora, tabela, operação
- Seção de diff visual: em vez de JSON bruto, mostrar uma tabela campo-por-campo:
  ```text
  Campo           | Antes          | Depois
  Status          | Aguardando     | Em Trânsito
  Motorista       | —              | João Silva
  ```
- Campos sem alteração ficam colapsados
- Manter opção de ver JSON bruto como fallback (colapsável)

### 4. Tabelas faltando no audit

Avaliar adicionar triggers para tabelas que hoje não são auditadas mas são críticas:
- `entrega_eventos`
- `viagem_entregas`
- `desvio_auditoria`
- `company_invites`
- `cargo_permissoes`

---

## Arquivos Afetados

| Arquivo | Alteração |
|---|---|
| Nova migration SQL | Adicionar colunas + atualizar `fn_audit_trigger` |
| `src/pages/admin/Logs.tsx` | Reformular UI: nome do usuário, código do registro, resumo legível, diff visual |
| Novo `src/lib/auditLabels.ts` | Dicionários de labels de campos e valores por tabela |

## Estratégia

- Colunas novas são nullable para não quebrar dados existentes
- Trigger atualizado preenche automaticamente para novos logs
- Frontend faz fallback para UUID/JSON quando campos enriquecidos estão vazios (dados antigos)

