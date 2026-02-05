
# Plano: Adicionar botões de ação no painel de viagem e definir viagens como modo padrão

## Resumo

Adicionar o mesmo padrão de botões de ação que existe no painel de detalhes de entrega ao painel de detalhes de viagem, com a funcionalidade de "Finalizar Viagem". Também alterar o modo de visualização padrão de "entregas" para "viagens".

---

## Mudanças a implementar

### 1. Alterar modo padrão para "viagens"

No arquivo `src/pages/portals/transportadora/OperacaoDiaria.tsx`, alterar o estado inicial de `viewMode`:

```
De: const [viewMode, setViewMode] = useState<ViewMode>('entregas');
Para: const [viewMode, setViewMode] = useState<ViewMode>('viagens');
```

### 2. Adicionar footer com botoes de acao no ViagemDetailPanel

No arquivo `src/components/viagens/ViagemDetailPanel.tsx`, adicionar:

**Novos imports necessarios:**
- `Loader2`, `MoreVertical`, `Ban`, `Paperclip`, `AlertTriangle` do lucide-react
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger`
- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`
- `toast` do sonner

**Novos estados:**
- `finalizarDialogOpen` - controla o dialog de confirmacao de finalizacao
- `cancelDialogOpen` - controla o dialog de confirmacao de cancelamento
- `isFinalizingViagem` - estado de loading durante a operacao

**Logica de validacao:**
- Verificar se todas as entregas estao com status `entregue` ou `cancelada`
- Se houver entregas pendentes, mostrar alerta e bloquear finalizacao
- Criar funcao `checkAllEntregasFinalized()` que retorna:
  - `canFinalize: boolean`
  - `pendingCount: number`
  - `pendingEntregas: string[]` (codigos das entregas pendentes)

**Novo footer (apos o ScrollArea):**

```text
+-------------------------------------------+
|  [...]  |     [Finalizar Viagem]          |
+-------------------------------------------+
```

- Botao de 3 pontinhos (esquerda):
  - "Anexar Manifesto" -> abre o dialog existente
  - Separador
  - "Cancelar viagem" -> abre dialog de confirmacao

- Botao principal "Finalizar Viagem" (direita):
  - Icone: CheckCircle
  - Cor: verde (bg-green-600)
  - Desabilitado quando ha entregas pendentes
  - Ao clicar: abre dialog de confirmacao

**Dialogs de confirmacao:**

1. Dialog de finalizacao:
   - Se todas entregas finalizadas: confirmar finalizacao
   - Se ha entregas pendentes: mostrar lista das pendentes e bloquear

2. Dialog de cancelamento:
   - Aviso de que a acao e irreversivel
   - Confirmar para cancelar a viagem

**Prop adicional necessaria:**
- `onFinalize?: (viagemId: string) => Promise<void>` - callback para finalizar a viagem
- `onCancel?: (viagemId: string) => Promise<void>` - callback para cancelar a viagem

### 3. Implementar callbacks no OperacaoDiaria

No arquivo `src/pages/portals/transportadora/OperacaoDiaria.tsx`:

- Criar mutation `finalizarViagemMutation` que atualiza o status da viagem para `finalizada`
- Criar mutation `cancelarViagemMutation` que atualiza o status da viagem para `cancelada`
- Passar os callbacks como props para o `ViagemDetailPanel`

---

## Secao Tecnica

### Arquivos a modificar:

1. **`src/pages/portals/transportadora/OperacaoDiaria.tsx`**
   - Linha 1295: Alterar estado inicial de `viewMode` para `'viagens'`
   - Adicionar mutations para finalizar/cancelar viagem
   - Passar callbacks para ViagemDetailPanel

2. **`src/components/viagens/ViagemDetailPanel.tsx`**
   - Adicionar imports de componentes de UI
   - Adicionar estados para dialogs
   - Adicionar funcao de validacao de entregas
   - Adicionar footer com botoes de acao
   - Adicionar AlertDialogs de confirmacao

### Fluxo de finalizacao:

```text
Usuario clica "Finalizar Viagem"
        |
        v
Verifica entregas pendentes
        |
   +----+----+
   |         |
   v         v
Ha pendentes  Todas OK
   |            |
   v            v
Mostra     Abre dialog
alerta     de confirmacao
   |            |
   X            v
            Atualiza status
            para "finalizada"
                |
                v
            Refetch dados
            Toast sucesso
```

### Regra de negocio:

A viagem so pode ser finalizada quando **TODAS** as entregas dentro dela estiverem com status:
- `entregue` (entrega concluida com sucesso)
- `cancelada` (entrega foi cancelada)

Qualquer entrega com status `aguardando`, `saiu_para_coleta` ou `saiu_para_entrega` bloqueia a finalizacao.
