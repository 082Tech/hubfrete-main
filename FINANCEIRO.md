# 💰 HubFrete — Módulo Financeiro (Documentação Completa)

> Documento técnico e de produto cobrindo regras de negócio, estrutura de dados e especificação da interface mobile **HubFrete Motoristas**.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Regras de Negócio](#2-regras-de-negócio)
3. [Estrutura do Banco de Dados](#3-estrutura-do-banco-de-dados)
4. [Fluxo Operacional Completo](#4-fluxo-operacional-completo)
5. [App Mobile — HubFrete Motoristas](#5-app-mobile--hubfrete-motoristas)
6. [Glossário](#6-glossário)

---

## 1. Visão Geral

O módulo financeiro da HubFrete controla o ciclo completo do dinheiro entre **Embarcadores** (quem paga), a **HubFrete** (intermediária com comissão) e **Transportadoras/Motoristas** (quem recebe).

### Participantes

| Ator | Papel financeiro |
|---|---|
| **Embarcador** | Paga o frete bruto total |
| **HubFrete** | Retém comissão (padrão 10%) |
| **Transportadora** | Recebe o valor líquido (bruto − comissão) |
| **Motorista Autônomo** | Recebe diretamente (funciona como transportadora individual) |
| **Motorista de Frota** | Visualiza ganhos, mas o pagamento vai para a transportadora |

### Fluxo do Dinheiro

```
Embarcador paga R$ 5.000 (frete bruto)
  └─ HubFrete retém R$ 500 (comissão 10%)
     └─ Transportadora/Autônomo recebe R$ 4.500 (líquido)
```

---

## 2. Regras de Negócio

### 2.1 Comissão HubFrete

- Campo: `empresas.comissao_hubfrete_percent`
- **NOT NULL** com valor padrão de **10%**
- Aplicada sobre o `valor_frete` de cada entrega
- Fórmula: `valor_comissao = valor_frete × (comissao_hubfrete_percent / 100)`
- Fórmula: `valor_liquido = valor_frete − valor_comissao`
- A comissão é configurável por empresa na Torre de Controle (Admin)

### 2.2 Ciclo de Faturamento — Quinzenas

O faturamento é agrupado em ciclos de 15 dias chamados **Quinzenas**:

| Quinzena | Período |
|---|---|
| **1ª Quinzena** | Dia 1 ao dia 15 do mês |
| **2ª Quinzena** | Dia 16 ao último dia do mês |

**Regras de abertura/fechamento:**
- Uma quinzena está **Aberta** enquanto a data atual estiver dentro do período
- Uma quinzena está **Fechada** quando a data atual ultrapassou o último dia do período
- Quinzenas fechadas ficam com ícone de cadeado (🔒), abertas com cadeado aberto (🔓)

### 2.3 Geração do Registro Financeiro

O registro em `financeiro_entregas` é gerado **automaticamente via trigger** no banco de dados quando uma entrega é finalizada (status → `entregue`):

1. A Edge Function `finalizar-entrega` atualiza o status da entrega
2. O trigger no banco detecta a mudança de status
3. O trigger cria um registro em `financeiro_entregas` com:
   - `valor_frete` — valor bruto do frete da entrega
   - `valor_comissao` — calculado com base na `comissao_hubfrete_percent` da empresa embarcadora
   - `valor_liquido` — diferença (bruto − comissão)
   - `status` = `'pendente'`
   - `empresa_embarcadora_id` — ID da empresa dona da carga
   - `empresa_transportadora_id` — ID da empresa que realizou a entrega
4. O trigger também cria/atualiza registros em `faturas` para ambos os lados (a_receber e a_pagar)

### 2.4 Status dos Registros Financeiros

| Status | Descrição |
|---|---|
| `pendente` | Entrega finalizada, pagamento ainda não realizado |
| `pago` | Pagamento confirmado pela Torre de Controle |

### 2.5 Status das Faturas (Quinzenas)

| Status | Descrição |
|---|---|
| `aberta` | Quinzena ainda em andamento, novas entregas podem entrar |
| `fechada` | Período encerrado, aguardando pagamento |
| `paga` | Todas as entregas da quinzena foram pagas |
| `cancelada` | Fatura cancelada (excepcional) |

### 2.6 Liquidação (Baixa)

- Realizada **exclusivamente** pela Torre de Controle (painel Admin)
- Suporta baixa **individual** (por entrega) ou **em lote** (quinzena inteira)
- Campos obrigatórios para baixa:
  - Data do pagamento
  - Método de pagamento (PIX, TED, Boleto, etc.)
  - **Upload de comprovante** (obrigatório, armazenado no bucket `comprovantes-financeiro`)
- Ao dar baixa em quinzena, atualiza atomicamente:
  - Todos os `financeiro_entregas` vinculados → `status = 'pago'`
  - A `fatura` correspondente → `status = 'paga'`

### 2.7 Dados Bancários

- Armazenados em `empresas.dados_bancarios` (JSONB)
- Estrutura:
  ```json
  {
    "banco": "Banco do Brasil",
    "agencia": "1234",
    "conta": "56789-0",
    "tipo_conta": "corrente",
    "pix": "email@exemplo.com",
    "titular": "Razão Social da Empresa"
  }
  ```
- Motoristas autônomos cadastram seus dados bancários na sua própria empresa (1:1)
- Motoristas de frota não cadastram dados bancários — o pagamento é direcionado à transportadora

### 2.8 Precificação do Frete

- **Por Tonelada**: `valor_total = valor_unitario × peso_em_toneladas`
- **Valor Fixo**: valor único para a carga inteira (somente cargas fechadas/não fracionadas)
- O valor total é o que entra como `valor_frete` na entrega e no financeiro

---

## 3. Estrutura do Banco de Dados

### 3.1 Tabela `financeiro_entregas`

Registro individual de cada entrega finalizada no sistema financeiro.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `entrega_id` | uuid (FK → entregas) | Entrega vinculada (1:1) |
| `empresa_embarcadora_id` | int (FK → empresas) | Empresa que contratou o frete |
| `empresa_transportadora_id` | int (FK → empresas) | Empresa que executou o frete |
| `valor_frete` | numeric | Valor bruto do frete |
| `valor_comissao` | numeric | Valor da comissão HubFrete |
| `valor_liquido` | numeric | Valor líquido (bruto − comissão) |
| `status` | text | `'pendente'` ou `'pago'` |
| `data_pagamento` | date | Data em que foi dado baixa |
| `metodo_pagamento` | text | PIX, TED, Boleto, etc. |
| `comprovante_url` | text | URL do comprovante no Storage |
| `observacoes` | text | Notas sobre o pagamento |
| `baixa_por` | uuid | User ID de quem deu baixa |
| `data_vencimento` | date | Vencimento previsto |
| `fatura_embarcador_id` | uuid (FK → faturas) | Fatura do lado "a receber" |
| `fatura_transportadora_id` | uuid (FK → faturas) | Fatura do lado "a pagar" |
| `created_at` | timestamptz | Data de criação (= data da entrega finalizada) |
| `updated_at` | timestamptz | Última atualização |

### 3.2 Tabela `faturas`

Agrupamento quinzenal de registros financeiros.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `empresa_id` | int (FK → empresas) | Empresa vinculada |
| `tipo` | enum | `'a_receber'` (embarcador) ou `'a_pagar'` (transportadora) |
| `quinzena` | int | `1` (dias 1-15) ou `2` (dias 16-fim) |
| `mes` | int | Mês (1-12) |
| `ano` | int | Ano |
| `periodo_inicio` | date | Primeiro dia do período |
| `periodo_fim` | date | Último dia do período |
| `valor_bruto` | numeric | Soma dos valores brutos |
| `valor_comissao` | numeric | Soma das comissões |
| `valor_liquido` | numeric | Soma dos valores líquidos |
| `qtd_entregas` | int | Quantidade de entregas no período |
| `status` | enum | `'aberta'`, `'fechada'`, `'paga'`, `'cancelada'` |
| `data_pagamento` | date | Data do pagamento |
| `metodo_pagamento` | text | Método utilizado |
| `comprovante_url` | text | Comprovante de pagamento |
| `observacoes` | text | Notas |
| `baixa_por` | uuid | Quem realizou a baixa |
| `created_at` | timestamptz | Criação |
| `updated_at` | timestamptz | Atualização |

### 3.3 Tabela `empresas` (campos financeiros relevantes)

| Coluna | Tipo | Descrição |
|---|---|---|
| `comissao_hubfrete_percent` | numeric NOT NULL DEFAULT 10 | Percentual de comissão |
| `dados_bancarios` | jsonb | Dados de conta bancária e PIX |

### 3.4 Relacionamentos

```
empresas (embarcadora)
  └─ faturas (tipo = 'a_receber')
     └─ financeiro_entregas (fatura_embarcador_id)
        └─ entregas → cargas

empresas (transportadora)
  └─ faturas (tipo = 'a_pagar')
     └─ financeiro_entregas (fatura_transportadora_id)
        └─ entregas → motoristas
```

### 3.5 Storage Buckets

| Bucket | Uso |
|---|---|
| `comprovantes-financeiro` | Comprovantes de pagamento (baixa individual e quinzena) |

---

## 4. Fluxo Operacional Completo

### 4.1 Ciclo de Vida de uma Entrega (perspectiva financeira)

```
1. Embarcador publica carga com valor de frete
   ↓
2. Transportadora aceita a carga → cria entrega
   ↓
3. Motorista coleta e entrega a carga
   ↓
4. Entrega finalizada (Edge Function `finalizar-entrega`)
   ↓
5. Trigger cria registro em `financeiro_entregas` (status: pendente)
   ↓
6. Trigger cria/atualiza `faturas` (embarcador: a_receber / transportadora: a_pagar)
   ↓
7. Admin (Torre de Controle) dá baixa com comprovante
   ↓
8. Status → 'pago' em financeiro_entregas e faturas
```

### 4.2 Visões por Portal

| Portal | O que vê | Valor destacado |
|---|---|---|
| **Embarcador** | Frete bruto total a pagar | Valor Bruto + informativo "comissão inclusa" |
| **Transportadora** | Valor líquido a receber | Valor Líquido (bruto − comissão) |
| **Admin (Torre)** | Ambos os lados + comissão | Bruto, Comissão, Líquido |
| **Motorista (App)** | Ganhos pessoais | Detalhado abaixo na Seção 5 |

---

## 5. App Mobile — HubFrete Motoristas

### 5.1 Contexto do Motorista

No app mobile, existem **dois tipos de motoristas**:

| Tipo | Relação financeira |
|---|---|
| **Autônomo** | É a própria "empresa" — recebe diretamente o valor líquido |
| **De Frota** | Vinculado a uma transportadora — vê seus ganhos mas o pagamento vai para a empresa |

### 5.2 Tela: Meus Ganhos (Financeiro)

A tela principal de financeiro no app do motorista. Deve ser acessível via menu inferior ou lateral.

#### 5.2.1 Header da Tela

```
┌─────────────────────────────────┐
│  💰 Meus Ganhos                 │
│  Acompanhe seus fretes          │
└─────────────────────────────────┘
```

#### 5.2.2 Cards de Resumo (topo)

Exibir 3 cards horizontais com scroll (ou grid 1×3 compacto):

| Card | Valor | Ícone | Cor |
|---|---|---|---|
| **A Receber** | Soma dos `valor_liquido` onde `status = 'pendente'` | 🕐 Clock | Amarelo/Âmbar |
| **Recebido** | Soma dos `valor_liquido` onde `status = 'pago'` | ✅ CheckCircle | Verde |
| **Total do Mês** | Soma total de `valor_liquido` do mês selecionado | 💵 DollarSign | Verde HubFrete |

**Para Motorista Autônomo:**
- `valor_liquido` = valor após comissão (o que ele efetivamente recebe)

**Para Motorista de Frota:**
- Exibir `valor_frete` como "Valor do Frete" (informativo)
- Adicionar nota: _"Pagamento direcionado à transportadora [Nome da Transportadora]"_
- O motorista de frota vê o valor do frete que gerou, mas **não** vê o split comissão/líquido

#### 5.2.3 Filtro de Período

- **MonthYearPicker** compacto (setas ← →) no topo
- Padrão: mês corrente
- Permite navegar mês a mês

#### 5.2.4 Lista de Quinzenas

Abaixo dos cards, listar as quinzenas do mês selecionado como cards colapsáveis:

```
┌─────────────────────────────────────────┐
│  📅 1ª Quinzena — Março 2026            │
│  01/03 a 15/03 · 4 cargas              │
│                                         │
│  🔒 Fechada        ⏳ Pendente          │
│                              R$ 4.200   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📅 2ª Quinzena — Março 2026            │
│  16/03 a 31/03 · 2 cargas              │
│                                         │
│  🔓 Aberta         ⏳ Pendente          │
│                              R$ 1.800   │
└─────────────────────────────────────────┘
```

**Ao expandir uma quinzena**, mostrar lista de cargas:

```
┌─────────────────────────────────────────┐
│  OFR-2026-0235-C01                      │
│  Delmiro Gouveia → Cabedelo             │
│  03/03/2026                             │
│                                         │
│  Bruto: R$ 5.000    Líquido: R$ 4.500  │
│                         ⏳ Pendente      │
├─────────────────────────────────────────┤
│  OFR-2026-0230-C01                      │
│  Recife → Maceió                        │
│  07/03/2026                             │
│                                         │
│  Bruto: R$ 3.200    Líquido: R$ 2.880  │
│                         ✅ Recebido      │
└─────────────────────────────────────────┘
```

#### 5.2.5 Detalhes de um Registro (ao tocar em uma carga)

Modal/Bottom Sheet com detalhamento completo:

```
┌─────────────────────────────────────────┐
│  Detalhes do Frete                   ✕  │
│─────────────────────────────────────────│
│                                         │
│  Carga: OFR-2026-0235-C01              │
│  Rota: Delmiro Gouveia → Cabedelo      │
│  Data: 03/03/2026                       │
│  Embarcador: Paleteria Alagoana         │
│                                         │
│  ─────────────────────────────────────  │
│  Valor Bruto:        R$ 5.000,00       │
│  Comissão (10%):    - R$ 500,00        │
│  ─────────────────────────────────────  │
│  Valor Líquido:      R$ 4.500,00   💚  │
│  ─────────────────────────────────────  │
│                                         │
│  Status: ⏳ Pendente                    │
│  Previsão: 2ª Quinzena de Março        │
│                                         │
│  [Se pago]:                             │
│  Pago em: 18/03/2026                    │
│  Método: PIX                            │
│  📎 Ver comprovante                     │
│                                         │
└─────────────────────────────────────────┘
```

**Para motorista de frota**, substituir o bloco financeiro por:

```
│  Valor do Frete:     R$ 5.000,00       │
│                                         │
│  ℹ️ Pagamento direcionado à             │
│     transportadora: Paleteria Alagoana  │
```

### 5.3 Tela: Dados Bancários (somente Autônomo)

Acessível via ícone de engrenagem na tela de Ganhos ou via Configurações.

**Somente motoristas autônomos** podem editar dados bancários. Motoristas de frota **não veem** esta seção.

```
┌─────────────────────────────────────────┐
│  🏦 Conta de Recebimento                │
│─────────────────────────────────────────│
│                                         │
│  Chave PIX                              │
│  ┌───────────────────────────────────┐  │
│  │ email@motorista.com               │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Banco                                  │
│  ┌───────────────────────────────────┐  │
│  │ Banco do Brasil                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Agência          Conta                 │
│  ┌──────────┐    ┌──────────────────┐  │
│  │ 1234     │    │ 56789-0          │  │
│  └──────────┘    └──────────────────┘  │
│                                         │
│  Tipo: ○ Corrente  ○ Poupança          │
│                                         │
│  Titular                                │
│  ┌───────────────────────────────────┐  │
│  │ João da Silva                     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [ 💾 Salvar Dados Bancários ]          │
│                                         │
└─────────────────────────────────────────┘
```

### 5.4 Consultas ao Banco (para o App)

#### Motorista Autônomo — buscar registros financeiros

O motorista autônomo é vinculado a uma empresa (1:1). A query filtra pela `empresa_transportadora_id`:

```sql
SELECT
  fe.*,
  e.codigo AS entrega_codigo,
  c.codigo AS carga_codigo,
  c.descricao,
  eo.cidade AS origem_cidade,
  ed.cidade AS destino_cidade,
  emp.nome_fantasia AS embarcador_nome
FROM financeiro_entregas fe
JOIN entregas e ON fe.entrega_id = e.id
JOIN cargas c ON e.carga_id = c.id
LEFT JOIN enderecos_carga eo ON c.endereco_origem_id = eo.id
LEFT JOIN enderecos_carga ed ON c.endereco_destino_id = ed.id
LEFT JOIN empresas emp ON fe.empresa_embarcadora_id = emp.id
WHERE fe.empresa_transportadora_id = :empresa_id
  AND fe.created_at >= :inicio_mes
  AND fe.created_at <= :fim_mes
ORDER BY fe.created_at DESC;
```

#### Motorista de Frota — buscar entregas realizadas

O motorista de frota filtra pelo `motorista_id` na tabela `entregas`:

```sql
SELECT
  e.id,
  e.codigo,
  e.valor_frete,
  e.status,
  e.entregue_em,
  c.codigo AS carga_codigo,
  c.descricao,
  eo.cidade AS origem_cidade,
  ed.cidade AS destino_cidade,
  emp_emb.nome_fantasia AS embarcador_nome,
  emp_transp.nome_fantasia AS transportadora_nome,
  fe.status AS status_financeiro,
  fe.valor_liquido,
  fe.valor_comissao,
  fe.data_pagamento
FROM entregas e
JOIN cargas c ON e.carga_id = c.id
LEFT JOIN enderecos_carga eo ON c.endereco_origem_id = eo.id
LEFT JOIN enderecos_carga ed ON c.endereco_destino_id = ed.id
LEFT JOIN empresas emp_emb ON c.empresa_id = emp_emb.id
LEFT JOIN empresas emp_transp ON e.veiculo_id IS NOT NULL
  AND emp_transp.id = (SELECT empresa_id FROM veiculos WHERE id = e.veiculo_id)
LEFT JOIN financeiro_entregas fe ON fe.entrega_id = e.id
WHERE e.motorista_id = :motorista_id
  AND e.status = 'entregue'
  AND e.entregue_em >= :inicio_mes
  AND e.entregue_em <= :fim_mes
ORDER BY e.entregue_em DESC;
```

### 5.5 Regras de Exibição por Tipo de Motorista

| Elemento | Autônomo | Frota |
|---|---|---|
| Cards de resumo (A Receber / Recebido) | ✅ Valor líquido | ✅ Valor do frete (informativo) |
| Breakdown Bruto/Comissão/Líquido | ✅ Visível | ❌ Oculto |
| Nota "Pagamento vai para a transportadora" | ❌ | ✅ Visível |
| Dados bancários (edição) | ✅ Pode editar | ❌ Não aparece |
| Status de pagamento (Pendente/Recebido) | ✅ Relevante | ⚠️ Mostrar como "Processado/Pendente" |
| Link para comprovante | ✅ Quando pago | ❌ |
| Gráfico anual de ganhos | ✅ | ✅ (valor do frete) |

### 5.6 Navegação no App

```
📱 Menu Inferior (Bottom Navigation)
├── 🏠 Início (Dashboard)
├── 📦 Cargas (Entregas ativas)
├── 💰 Ganhos (Financeiro)  ← ESTA SEÇÃO
├── 📍 Rotas
└── ⚙️ Perfil
```

Dentro de **Ganhos**:
- Tela principal com cards + quinzenas
- Toque em quinzena → expande lista de cargas
- Toque em carga → bottom sheet com detalhes
- Ícone ⚙️ no header → Dados Bancários (somente autônomo)

### 5.7 Notificações Financeiras (Push)

| Evento | Mensagem | Quem recebe |
|---|---|---|
| Pagamento processado | "💰 Pagamento de R$ X.XXX recebido! Confira em Meus Ganhos." | Autônomo |
| Quinzena fechada | "📅 Quinzena encerrada. X cargas totalizando R$ X.XXX aguardam pagamento." | Autônomo |
| Pagamento da transportadora | "💰 Sua transportadora recebeu o pagamento da quinzena." | Frota |

---

## 6. Glossário

| Termo | Definição |
|---|---|
| **Valor Bruto** | Valor total do frete cobrado do embarcador |
| **Comissão HubFrete** | Percentual retido pela plataforma (padrão 10%) |
| **Valor Líquido** | Valor bruto menos comissão — o que a transportadora/autônomo recebe |
| **Quinzena** | Ciclo de faturamento de 15 dias (1ª: dias 1-15, 2ª: dias 16-fim) |
| **Baixa** | Ato de confirmar pagamento no sistema (requer comprovante) |
| **Fatura** | Agrupamento quinzenal de registros financeiros |
| **Financeiro Entregas** | Registro individual de cada entrega no sistema financeiro |
| **Autônomo** | Motorista que opera independentemente, é sua própria empresa |
| **Frota** | Motorista vinculado a uma transportadora |
| **Torre de Controle** | Painel administrativo da HubFrete |
