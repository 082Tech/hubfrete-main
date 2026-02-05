

# Plano: Refatoração do Fluxo Operacional - Viagens e Documentação Fiscal

## Resumo Executivo

Implementar o novo modelo operacional onde:
1. **Manifesto (MDF-e)** é anexado à **Viagem** (não à Entrega)
2. **NF-e** é obrigatória antes de "Saiu para Entrega"
3. **Switch de visualização** no topo da tela para alternar entre "Por Entregas" (atual) e "Por Viagens"
4. Quando na visualização por viagens, ao clicar numa viagem, a terceira coluna mostra uma lista de entregas para escolher qual abrir

---

## Arquitetura de Dados (Já Existente)

```text
┌─────────────────────────────────────────────────────────────────┐
│                        ESTRUTURA ATUAL                          │
├─────────────────────────────────────────────────────────────────┤
│  viagens                                                        │
│  ├── id, codigo (VGM-YYYY-NNNN)                                │
│  ├── motorista_id, veiculo_id, carroceria_id                   │
│  ├── status (em_andamento, finalizada, cancelada)              │
│  └── manifesto_url (NOVO CAMPO NECESSÁRIO)                     │
│                                                                 │
│  viagem_entregas (tabela de junção)                            │
│  ├── viagem_id, entrega_id, ordem                              │
│                                                                 │
│  entregas                                                       │
│  ├── cte_url, notas_fiscais_urls, canhoto_url                  │
│  └── manifesto_url (mover para viagens)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### 1. Banco de Dados (Migration)

**Adicionar campo `manifesto_url` na tabela `viagens`:**

```sql
-- Adicionar manifesto_url à viagem
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS manifesto_url TEXT;

-- Opcional: migrar manifestos existentes de entregas para viagens
-- (depende da lógica de negócio desejada)
```

### 2. Interface - Switch de Visualização

**Arquivo:** `src/pages/portals/transportadora/OperacaoDiaria.tsx`

Adicionar no header, após os botões existentes:

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Gestão de Entregas [?]                                              │
│  Visualize sua operação diária                                       │
│                                                                      │
│  [🔄] [Filtros] [Desempenho] [Mapa]    [Por Entregas ◦──● Por Viagens]│
└──────────────────────────────────────────────────────────────────────┘
```

**Estado novo:**
```typescript
const [viewMode, setViewMode] = useState<'entregas' | 'viagens'>('entregas');
```

### 3. Nova Query para Viagens

Quando `viewMode === 'viagens'`, buscar viagens em andamento da empresa com suas entregas:

```typescript
const { data: viagens = [] } = useQuery({
  queryKey: ['gestao-viagens', empresa?.id],
  queryFn: async () => {
    // 1. Buscar motoristas da empresa
    // 2. Buscar viagens em_andamento desses motoristas
    // 3. Para cada viagem, buscar entregas via viagem_entregas
    // 4. Retornar estrutura agrupada
  },
  enabled: viewMode === 'viagens' && !!empresa?.id,
});
```

### 4. Componentes Novos

#### ViagemListItem (análogo ao EntregaListItem)

```text
┌─────────────────────────────────────────────────────────┐
│  [Avatar Motorista]  João Silva                         │
│                      VGM-2026-0042                      │
│                      3 entregas • Em andamento          │
│                      São Paulo → Campinas → Ribeirão    │
│                                            há 2h        │
└─────────────────────────────────────────────────────────┘
```

#### ViagemDetailPanel (terceira coluna)

Quando uma viagem é selecionada, a terceira coluna mostra:

```text
┌─────────────────────────────────────────────────────────┐
│  Viagem VGM-2026-0042                    [📤 📤 🖨️ ✕]  │
│  Criada 05/02/2026 às 08:30                             │
│                                                         │
│  ▌ Em Andamento há 4h                                   │
│                                                         │
│  ────────────────────────────────────────────────────   │
│  MOTORISTA                                              │
│  [Avatar] João Silva   ● Online                         │
│           Placa ABC-1234                                │
│                                                         │
│  ────────────────────────────────────────────────────   │
│  DOCUMENTOS DA VIAGEM                                   │
│  [✓] Manifesto (MDF-e)     [✗] POD Digital              │
│                                                         │
│  ────────────────────────────────────────────────────   │
│  ENTREGAS DESTA VIAGEM (3)                              │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ #ENT-001   Aguardando                             │  │
│  │ SP → Campinas • 500kg • R$ 1.200                  │  │
│  │                           [Ver Detalhes →]        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ #ENT-002   Saiu para Coleta                       │  │
│  │ Campinas → Ribeirão • 300kg • R$ 800              │  │
│  │                           [Ver Detalhes →]        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Ao clicar em "Ver Detalhes", abre o **DetailPanel** atual da entrega.

### 5. Validação de NF-e antes de "Saiu para Entrega"

**Arquivo:** `src/pages/portals/transportadora/OperacaoDiaria.tsx` (DetailPanel)

Na função `getNextStatus` e `handleActionClick`, adicionar verificação:

```typescript
// Ao tentar mudar para 'saiu_para_entrega'
if (nextStatus.status === 'saiu_para_entrega') {
  if (!entrega.notas_fiscais_urls?.length) {
    toast.error('Para sair para entrega, anexe a NF-e desta entrega');
    return;
  }
}
```

**Também adicionar validação visual:**
- Destacar o campo NF-e como obrigatório quando status = `saiu_para_coleta`
- Exibir banner de alerta se NF-e estiver faltando

### 6. Anexar Manifesto na Viagem

**Novo Dialog:** `AnexarManifestoViagemDialog.tsx`

- Acessível via menu de ações da viagem
- Faz upload para bucket `manifestos/` com path `{viagem_id}/manifesto.pdf`
- Atualiza `viagens.manifesto_url`

### 7. Ajustes na Checklist de Documentos

**Na visualização por entrega:**
```text
Documentos da Entrega:
[✓/✗] CT-e           (emitido pelo HubFrete por entrega)
[✓/✗] NF-e           (anexado pelo embarcador, obrigatório antes de sair)
[✓/✗] Canhoto/POD    (coletado na entrega)

Documento da Viagem:
[✓/✗] Manifesto      (link para ver na viagem)
```

**Na visualização por viagem:**
```text
Documentos da Viagem:
[✓/✗] Manifesto (MDF-e)

Documentos das Entregas: (resumo)
ENT-001: CT-e ✓, NF-e ✓, POD ✗
ENT-002: CT-e ✗, NF-e ✓, POD ✗
```

---

## Fluxo Visual

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                         MODO: POR ENTREGAS (Atual)                         │
├────────────────────────────────────────────────────────────────────────────┤
│  Coluna 1          │  Coluna 2              │  Coluna 3                    │
│  Aguardando        │  Em Rota/Finalizadas   │  Detalhes da Entrega         │
│                    │                        │                              │
│  [Entrega 1]       │  [Entrega 3]           │  #ENT-001                    │
│  [Entrega 2]       │  [Entrega 4]           │  Status, Mapa, Docs, Chat    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                         MODO: POR VIAGENS (Novo)                           │
├────────────────────────────────────────────────────────────────────────────┤
│  Coluna 1          │  Coluna 2              │  Coluna 3                    │
│  Em Andamento      │  Finalizadas           │  Detalhes da Viagem          │
│                    │                        │                              │
│  [Viagem 1]        │  [Viagem 3]            │  VGM-2026-0042               │
│  [Viagem 2]        │                        │  Motorista, Manifesto        │
│                    │                        │  Lista de Entregas:          │
│                    │                        │    → [ENT-001] Ver Detalhes  │
│                    │                        │    → [ENT-002] Ver Detalhes  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/portals/transportadora/OperacaoDiaria.tsx` | Modificar | Switch de visualização, nova query de viagens, componentes condicionais |
| `src/components/viagens/ViagemListItem.tsx` | Criar | Item de lista para viagens (similar ao EntregaListItem) |
| `src/components/viagens/ViagemDetailPanel.tsx` | Criar | Painel de detalhes da viagem com lista de entregas |
| `src/components/viagens/AnexarManifestoViagemDialog.tsx` | Criar | Dialog para anexar manifesto na viagem |
| `src/components/viagens/index.ts` | Modificar | Exportar novos componentes |
| `supabase/migrations/XXXXXX_add_manifesto_to_viagens.sql` | Criar | Adicionar campo manifesto_url |

---

## Validações de Negócio Implementadas

1. **NF-e obrigatória para "Saiu para Entrega"**
   - Bloqueia transição se `notas_fiscais_urls` estiver vazio
   - Exibe toast de erro explicativo

2. **Manifesto vinculado à Viagem**
   - Removido de `entregas` (visualmente), mantido no DB por compatibilidade
   - Novo campo em `viagens.manifesto_url`

3. **Validação de documentos por contexto**
   - Entrega: CT-e, NF-e, Canhoto/POD
   - Viagem: Manifesto (MDF-e)

---

## Sequência de Implementação

1. **Migration de banco** - Adicionar `manifesto_url` em `viagens`
2. **Switch de visualização** - Estado e toggle no header
3. **Query de viagens** - Buscar viagens com entregas agrupadas
4. **ViagemListItem** - Componente de lista
5. **ViagemDetailPanel** - Painel com lista de entregas clicáveis
6. **AnexarManifestoViagemDialog** - Upload de manifesto
7. **Validação NF-e** - Bloquear "Saiu para Entrega" sem NF
8. **Ajustes visuais** - Indicadores, alertas, checklist atualizada

