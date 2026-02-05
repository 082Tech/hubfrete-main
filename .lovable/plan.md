
# Plano: Fluxo de Iniciar/Finalizar Viagem - IMPLEMENTADO ✓

## Resumo

Implementado o ciclo de vida completo da viagem com os status: `programada` → `em_andamento` → `finalizada/cancelada`.

---

## Mudanças implementadas

### 1. Status de Viagem

- **programada**: Viagem criada, aguardando início (entregas bloqueadas)
- **em_andamento**: Viagem em execução (entregas liberadas)
- **finalizada**: Viagem concluída (todas entregas finalizadas)
- **cancelada**: Viagem cancelada

### 2. Criação de Viagem

Ao alocar uma carga para um motorista, a viagem é criada com status `programada` em vez de `em_andamento`. Isso bloqueia automaticamente que novas entregas sejam adicionadas após o início.

### 3. Botões de Ação no ViagemDetailPanel

- **"Iniciar Viagem"**: Exibido quando status = `programada`
  - Muda status para `em_andamento`
  - Atualiza `inicio_em` e `started_at`
  - Libera as entregas para execução

- **"Finalizar Viagem"**: Exibido quando status = `em_andamento`
  - Só habilitado quando todas entregas estão `entregue` ou `cancelada`
  - Muda status para `finalizada`

- Menu de 3 pontos: Anexar Manifesto e Cancelar Viagem

### 4. Bloqueio de Status nas Entregas

Quando a viagem está com status `programada`:
- Os botões de ação no DetailPanel ficam desabilitados
- Um alerta azul é exibido: "Viagem não iniciada. Inicie a viagem primeiro para liberar as ações de entrega."

### 5. Colunas na Tela de Gestão (Modo Viagens)

- **Coluna 1 - Ativas**: Viagens `programada` + `em_andamento`
- **Coluna 2 - Finalizadas**: Viagens `finalizada`
- **Coluna 3 - Detalhes**: ViagemDetailPanel com ações

---

## Arquivos modificados

1. `src/pages/portals/transportadora/CargasDisponiveis.tsx`
   - Criação de viagem com status `programada`

2. `src/pages/portals/transportadora/OperacaoDiaria.tsx`
   - Query atualizada para incluir status `programada`
   - Nova mutation `iniciarViagemMutation`
   - Prop `viagemStatus` no DetailPanel
   - Lógica de bloqueio quando viagem não iniciada
   - Colunas atualizadas para mostrar viagens ativas

3. `src/components/viagens/ViagemDetailPanel.tsx`
   - Nova prop `onStart`
   - Botão "Iniciar Viagem" condicional
   - Alertas informativos para cada estado
   - Dialog de confirmação para iniciar viagem

4. `src/components/viagens/ViagemListItem.tsx`
   - Status `programada` adicionado ao config

---

## Fluxo Operacional

```
Carga Alocada
      ↓
Viagem Criada (programada)
      ↓
   [Operador pode adicionar mais entregas]
      ↓
Clica "Iniciar Viagem"
      ↓
Viagem Em Andamento
      ↓
   [Motorista executa entregas]
   [Não pode adicionar mais entregas]
      ↓
Todas entregas finalizadas
      ↓
Clica "Finalizar Viagem"
      ↓
Viagem Finalizada
```
