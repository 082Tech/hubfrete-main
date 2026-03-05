# 📖 Documentação Completa — Migração Terminológica: "Oferta de Carga"

**Data**: 05/03/2026  
**Versão**: 1.0  
**Projeto**: HubFrete  

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Glossário de Termos (Antes vs Depois)](#2-glossário-de-termos)
3. [Mudanças no Banco de Dados](#3-mudanças-no-banco-de-dados)
4. [Mudanças na Interface (Frontend)](#4-mudanças-na-interface-frontend)
5. [Checklist de Aplicação](#5-checklist-de-aplicação)

---

## 1. Visão Geral

A plataforma HubFrete opera como um **marketplace de frete**. A mudança terminológica reflete melhor o modelo de negócio:

- O **Embarcador** publica uma **Oferta de Carga** (antes chamada apenas de "Carga").
- A **Transportadora** aceita a oferta, gerando uma **Carga** operacional (antes chamada de "Entrega").

### Modelo Conceitual

```
┌──────────────────────────────────────────────────────┐
│  EMBARCADOR publica → OFERTA DE CARGA (tabela cargas)│
│  Código: OFR-2026-0001                               │
│                                                      │
│  TRANSPORTADORA aceita → CARGA (tabela entregas)     │
│  Código: OFR-2026-0001-C01                           │
│                                                      │
│  MOTORISTA executa → dentro de uma VIAGEM            │
│  Código: VGM-2026-0001                               │
└──────────────────────────────────────────────────────┘
```

### Resumo das Mudanças

| Aspecto | O que mudou |
|---------|-------------|
| **Prefixo de código** | `CRG-` → `OFR-` (tabela `cargas`) |
| **Sufixo de código** | `-EXX` → `-CXX` (tabela `entregas`) |
| **Trigger `generate_carga_codigo`** | Gera `OFR-YYYY-NNNN` em vez de `CRG-YYYY-NNNN` |
| **Trigger `generate_entrega_codigo`** | Gera `-C01`, `-C02` em vez de `-E01`, `-E02` |
| **Labels de status** | `Entregue` → `Concluída`, `Em Entrega` → `Em Rota`, `Canhoto` → `Comprovante de Entrega` |
| **Menus do Embarcador** | "Minhas Cargas" → "Minhas Ofertas", ícone `Boxes` |
| **Menus da Transportadora** | "Cargas Disponíveis" → "Ofertas de Carga", ícone `Boxes` |
| **Título da página de criação** | "Nova Carga" → "Nova Oferta de Carga" |

---

## 2. Glossário de Termos

### Mapeamento Completo: Termo Antigo → Termo Novo

| Termo Antigo | Termo Novo | Tabela no DB | Contexto |
|---|---|---|---|
| Carga | **Oferta de Carga** ou **Oferta** | `cargas` | O que o embarcador publica |
| Código CRG-YYYY-NNNN | **OFR-YYYY-NNNN** | `cargas.codigo` | Identificador único da oferta |
| Entrega | **Carga** | `entregas` | O que a transportadora opera |
| Código CRG-YYYY-NNNN-E01 | **OFR-YYYY-NNNN-C01** | `entregas.codigo` | Identificador da carga operacional |
| Entregue (status) | **Concluída** | `entregas.status` | Status terminal de sucesso |
| Em Entrega (status) | **Em Rota** | `entregas.status` | Motorista em deslocamento |
| Saiu para Entrega (label) | **Saiu para Entrega** | `entregas.status` | Status terminal de saída (mantido) |
| Canhoto | **Comprovante de Entrega** | `entregas.canhoto_url` | Prova de conclusão |
| Minhas Cargas (menu emb.) | **Minhas Ofertas** | — | Menu sidebar embarcador |
| Cargas Disponíveis (menu transp.) | **Ofertas de Carga** | — | Menu sidebar transportadora |
| Minhas Entregas (menu transp.) | **Minhas Cargas** | — | Menu sidebar transportadora |

### Contexto por Portal

| Portal | Onde Aparece | Texto Antigo | Texto Novo |
|--------|-------------|--------------|------------|
| **Embarcador** | Sidebar menu | Minhas Cargas | Minhas Ofertas |
| **Embarcador** | Título da página | Cargas Publicadas | Ofertas de Cargas Publicadas |
| **Embarcador** | Botão de criação | Nova Carga | Nova Oferta de Carga |
| **Embarcador** | Gestão | Gestão de Cargas | Gestão de Cargas *(mantido — refere-se às cargas operacionais)* |
| **Transportadora** | Sidebar menu | Cargas Disponíveis | Ofertas de Carga |
| **Transportadora** | Sidebar menu | Entregas / Operação | Minhas Cargas |
| **Transportadora** | Submenu | Em andamento | Em andamento *(mantido)* |
| **Transportadora** | Submenu | Histórico | Histórico *(mantido)* |
| **Admin** | Título | Cargas | Ofertas |
| **Admin** | Título | Entregas | Cargas |

---

## 3. Mudanças no Banco de Dados

### 3.1 Trigger: `generate_carga_codigo`

**O que faz**: Gera automaticamente o código de identificação ao inserir um registro na tabela `cargas`.

**O que mudou**: O prefixo gerado mudou de `CRG-` para `OFR-`.

**Como funciona**:
- Ao criar uma nova oferta, se `codigo` for `NULL` ou vazio, o trigger gera automaticamente.
- Formato: `OFR-{ANO}-{SEQUÊNCIA_4_DÍGITOS}` (ex: `OFR-2026-0001`).
- A sequência é calculada buscando o maior número existente entre códigos `OFR-` **e** `CRG-` do mesmo ano (retrocompatibilidade).

**SQL aplicado**:
```sql
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
    
    -- Busca a maior sequência entre OFR- e CRG- (retrocompatibilidade)
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
```

---

### 3.2 Trigger: `generate_entrega_codigo`

**O que faz**: Gera automaticamente o código da entrega (carga operacional) baseado no código da oferta pai.

**O que mudou**: O sufixo gerado mudou de `-EXX` para `-CXX`.

**Como funciona**:
- Ao criar uma nova entrega vinculada a uma carga, o trigger busca o `codigo` da carga pai.
- Formato: `{CODIGO_CARGA}-C{SEQUÊNCIA_2_DÍGITOS}` (ex: `OFR-2026-0001-C01`).
- A sequência conta quantas entregas já existem para aquela carga.

**SQL aplicado**:
```sql
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
```

---

### 3.3 Migração de Dados Existentes

**O que faz**: Renomeia todos os códigos legados no banco para a nova nomenclatura.

**SQL aplicado**:
```sql
-- 1. Cargas: CRG-* → OFR-*
UPDATE public.cargas
SET codigo = REPLACE(codigo, 'CRG-', 'OFR-')
WHERE codigo LIKE 'CRG-%';

-- 2. Entregas: CRG- → OFR- E -EXX → -CXX
UPDATE public.entregas
SET codigo = REGEXP_REPLACE(
  REPLACE(codigo, 'CRG-', 'OFR-'),
  '-E(\d+)$',
  '-C\1'
)
WHERE codigo LIKE 'CRG-%' OR codigo LIKE '%-E%';
```

**Impacto**: Apenas visual (exibição de códigos). Não afeta integridade referencial pois os vínculos são feitos por `UUID` (`id`), não por `codigo`.

---

### 3.4 Trigger: `notify_entrega_status_change`

**O que mudou**: Os labels de status nas notificações foram atualizados.

| Status DB | Label Antigo | Label Novo |
|-----------|-------------|------------|
| `entregue` | Entregue | **Concluída** |
| `saiu_para_entrega` | Saiu para Entrega | Saiu para Entrega *(mantido)* |
| `saiu_para_coleta` | Saiu para Coleta | Saiu para Coleta *(mantido)* |
| `aguardando` | Aguardando | Aguardando *(mantido)* |
| `cancelada` | Cancelada | Cancelada *(mantido)* |

**Texto das notificações**: Usa "Carga" + código da entrega (ex: "Carga OFR-2026-0001-C01 - Concluída").

---

### 3.5 Function: `aceitar_carga_v8`

**O que mudou nas mensagens de erro/retorno**:

| Antes | Depois |
|-------|--------|
| `'Carga não encontrada'` | `'Oferta não encontrada'` |
| `'Carga não está disponível'` | `'Oferta não está disponível para aceite'` |

---

### 3.6 Tabelas — Estrutura Inalterada

> ⚠️ **IMPORTANTE**: Os nomes das tabelas e colunas no banco de dados **NÃO foram alterados**. A migração é **puramente visual/terminológica** no frontend e nos códigos gerados.

| Tabela | Nome no DB | Representa na UI |
|--------|-----------|-----------------|
| `cargas` | Mantido como `cargas` | **Oferta de Carga** |
| `entregas` | Mantido como `entregas` | **Carga** (operacional) |
| `cargas.codigo` | Mantido | Agora gera `OFR-` em vez de `CRG-` |
| `entregas.codigo` | Mantido | Agora gera `-C` em vez de `-E` |
| `entregas.status` | Mantido (`entregue`, etc.) | Labels traduzidos no frontend |
| `entregas.canhoto_url` | Mantido | Exibido como "Comprovante de Entrega" |

---

## 4. Mudanças na Interface (Frontend)

### 4.1 Arquivos Já Alterados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/portals/embarcador/NovaCarga.tsx` | Título: "Nova Oferta de Carga", dialog de confirmação de saída |
| `src/pages/portals/embarcador/CargasPublicadas.tsx` | Título: "Ofertas de Cargas Publicadas" |
| `src/components/portals/PortalSidebar.tsx` | Menus renomeados para "Minhas Ofertas" e "Ofertas de Carga" |
| `src/components/portals/BottomNavigation.tsx` | Labels de navegação mobile atualizados |

### 4.2 Lista Completa de Arquivos que DEVEM Ser Revisados

> Abaixo estão todos os arquivos que contêm referências textuais que devem ser atualizadas para a nova terminologia. **Atenção**: alterar apenas textos visíveis ao usuário (labels, títulos, placeholders), **nunca** nomes de tabelas, colunas ou variáveis internas.

#### Portal do Embarcador

| Arquivo | O que procurar | O que substituir |
|---------|---------------|-----------------|
| `src/pages/portals/embarcador/GestaoCargas.tsx` | Textos "Entregas" referentes às cargas operacionais | Trocar para "Cargas" |
| `src/pages/portals/embarcador/HistoricoCargas.tsx` | "Histórico de Cargas" (se referir a ofertas) | "Histórico de Ofertas" |
| `src/pages/portals/embarcador/EditarCarga.tsx` | Título "Editar Carga" | "Editar Oferta de Carga" |
| `src/components/cargas/NovaCargaDialog.tsx` | Qualquer referência "Nova Carga" | "Nova Oferta de Carga" |
| `src/components/cargas/EditarCargaDialog.tsx` | "Editar Carga" | "Editar Oferta" |
| `src/components/cargas/CargaDetailsDialog.tsx` | "Detalhes da Carga" (se oferta) | "Detalhes da Oferta" |

#### Portal da Transportadora

| Arquivo | O que procurar | O que substituir |
|---------|---------------|-----------------|
| `src/pages/portals/transportadora/CargasDisponiveis.tsx` | "Cargas Disponíveis" | "Ofertas de Carga" |
| `src/pages/portals/transportadora/OperacaoDiaria.tsx` | "Entregas" (operacionais) | "Cargas" |
| `src/pages/portals/transportadora/HistoricoEntregas.tsx` | "Histórico de Entregas" | "Histórico de Cargas" |
| `src/components/entregas/EntregaDetailsDialog.tsx` | "Detalhes da Entrega" | "Detalhes da Carga" |
| `src/components/entregas/EntregaDocsDialog.tsx` | "Documentos da Entrega" | "Documentos da Carga" |

#### Componentes Compartilhados

| Arquivo | O que procurar | O que substituir |
|---------|---------------|-----------------|
| `src/components/entregas/EntregaDocumentosPanel.tsx` | "Canhoto" | "Comprovante de Entrega" |
| `src/components/viagens/ViagemDetailPanel.tsx` | "Entregas da Viagem" | "Cargas da Viagem" |
| `src/components/viagens/ViagemListItem.tsx` | Labels "Entrega" | "Carga" |
| `src/components/viagens/ViagemHistorico.tsx` | "Entregas" | "Cargas" |

#### Admin

| Arquivo | O que procurar | O que substituir |
|---------|---------------|-----------------|
| `src/pages/admin/CargasAdmin.tsx` | Título "Cargas" | "Ofertas" |
| `src/pages/admin/EntregasAdmin.tsx` | Título "Entregas" | "Cargas" |
| `src/pages/admin/CargasHistoricoAdmin.tsx` | "Histórico de Cargas" | "Histórico de Ofertas" |
| `src/components/admin/AdminSidebar.tsx` | Labels de menu | Atualizar para nova terminologia |

#### Status Labels (em TODOS os arquivos que exibem status)

| Status no DB | Label Antigo | Label Novo |
|---|---|---|
| `entregue` | Entregue | **Concluída** |
| `saiu_para_entrega` | Em Entrega / Saiu para Entrega | **Em Rota** / Saiu para Entrega |
| `cancelada` | Cancelada | Cancelada *(mantido)* |
| `aguardando` | Aguardando | Aguardando *(mantido)* |
| `saiu_para_coleta` | Saiu para Coleta | Saiu para Coleta *(mantido)* |

---

## 5. Checklist de Aplicação

### Para o Banco de Dados (Produção)

- [ ] Executar migração de códigos: `CRG-` → `OFR-` na tabela `cargas`
- [ ] Executar migração de códigos: `CRG-` → `OFR-` e `-EXX` → `-CXX` na tabela `entregas`
- [ ] Aplicar trigger `generate_carga_codigo` (nova versão com `OFR-`)
- [ ] Aplicar trigger `generate_entrega_codigo` (nova versão com `-C`)
- [ ] Aplicar function `notify_entrega_status_change` (label `Concluída`)
- [ ] Aplicar function `aceitar_carga_v8` (mensagens atualizadas)
- [ ] Verificar se a coluna `metadata` existe na tabela `notificacoes`

### Para o Frontend (Código)

- [ ] Renomear todos os títulos de página conforme seção 4.2
- [ ] Atualizar labels de menu no sidebar de cada portal
- [ ] Atualizar labels de status em todas as tabelas e cards
- [ ] Trocar "Canhoto" por "Comprovante de Entrega" em todos os componentes
- [ ] Atualizar textos de notificações/toasts no frontend
- [ ] Atualizar textos de confirmação em diálogos
- [ ] Verificar relatórios e exportações (PDF/Excel) para terminologia correta

### Regra de Ouro

> **NUNCA** renomear tabelas, colunas ou variáveis internas do código. A migração é **100% visual** — apenas textos exibidos ao usuário final são alterados. Os nomes técnicos (`cargas`, `entregas`, `carga_id`, `entrega_id`) permanecem inalterados no banco e no código.

---

## Referências

- `PLANO_MIGRACAO_PRODUCAO.md` — SQL completo para aplicar no banco de produção
- `DOCUMENTACAO_HUBFRETE.md` — Manual técnico geral da plataforma
- `.lovable/memory/architecture/terminology-overhaul-v4` — Memory com resumo da reformulação
