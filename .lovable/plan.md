
# Plano: Adicionar Tooltip de Ajuda e Atualizar Legenda na Gestão de Entregas

## Resumo
Vou adicionar um ícone de interrogação ao lado do título "Gestão de Entregas" que, ao passar o mouse, exibe uma explicação sobre a funcionalidade da página. Também vou atualizar a legenda para "Visualize sua operação diária".

## Alterações

### 1. Atualizar Header da Página
**Arquivo:** `src/pages/portals/transportadora/OperacaoDiaria.tsx`

- Adicionar imports do Tooltip: `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`
- Adicionar import do ícone `HelpCircle` (já existe outros ícones do lucide-react)
- Modificar o título de "Gestão Entregas" para "Gestão de Entregas"
- Adicionar ícone de interrogação em círculo ao lado do título
- Configurar o tooltip com explicação da página
- Atualizar legenda para "Visualize sua operação diária"

### 2. Conteúdo do Tooltip
O tooltip vai explicar de forma clara:
- Que esta é a central de operações diárias em tempo real
- Que as entregas finalizadas (entregues ou canceladas) permanecem visíveis até o fim do dia
- Que na virada do dia, as entregas concluídas são movidas automaticamente para o Histórico de Entregas
- Que entregas pendentes e em andamento continuam visíveis até serem finalizadas

### 3. Resultado Visual Esperado

```text
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Gestão de Entregas (?)   [Refresh] [Filtros] [Desempenho] [Mapa]
│  Visualize sua operação diária                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼ (hover no ?)
         ┌────────────────────────────────────────┐
         │ Central de Operações Diárias           │
         │                                        │
         │ Acompanhe em tempo real todas as       │
         │ entregas do dia atual.                 │
         │                                        │
         │ • Entregas finalizadas permanecem      │
         │   visíveis até a virada do dia         │
         │ • Na virada do dia, são movidas        │
         │   automaticamente para o Histórico     │
         │ • Entregas pendentes continuam até     │
         │   serem concluídas                     │
         └────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Imports a Adicionar
```typescript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
```

### Estrutura do Header
```typescript
<div>
  <div className="flex items-center gap-2">
    <h1 className="text-3xl font-bold text-foreground">Gestão de Entregas</h1>
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="w-5 h-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-sm p-3">
          <p className="font-medium mb-1">Central de Operações Diárias</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Acompanhe em tempo real todas as entregas do dia. As entregas finalizadas 
            (entregues ou canceladas) permanecem visíveis até o fim do dia, quando são 
            automaticamente movidas para o Histórico de Entregas.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
  <p className="text-muted-foreground">Visualize sua operação diária</p>
</div>
```

### Arquivo Modificado
- `src/pages/portals/transportadora/OperacaoDiaria.tsx`
