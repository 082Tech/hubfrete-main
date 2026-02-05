

# Plano: Ajustar Cores e Tooltip do Histórico de Rastreamento

## Resumo

Atualizar os marcadores do histórico de rastreamento para usar as cores padrão da plataforma e melhorar o tooltip com informações de velocidade.

---

## Alterações Necessárias

### 1. Corrigir Paleta de Cores

Atualizar `statusColors` no arquivo `TrackingHistoryMarkers.tsx` para seguir o padrão da plataforma:

| Status | Cor Atual | Cor Correta |
|--------|-----------|-------------|
| aguardando | Cinza (#6b7280) | **Laranja (#f59e0b)** |
| saiu_para_coleta | Azul (#3b82f6) | **Ciano (#06b6d4)** |
| saiu_para_entrega | Roxo (#a855f7) | Roxo (#a855f7) ✓ |
| entregue | Verde (#22c55e) | Verde (#22c55e) ✓ |
| problema | Vermelho (#ef4444) | Vermelho (#ef4444) ✓ |
| cancelada | Cinza (#6b7280) | **Vermelho (#ef4444)** |

### 2. Adicionar Velocidade no Tooltip

Atualizar o `Tooltip` para exibir:
- Status com ícone
- Horário do ponto
- **Velocidade em km/h** (novo)
- Observações (se houver)

---

## Arquivo Modificado

**`src/components/maps/TrackingHistoryMarkers.tsx`**

```typescript
// Cores corrigidas para o padrão da plataforma
const statusColors: Record<string, string> = {
  'aguardando': '#f59e0b',      // Laranja (era cinza)
  'saiu_para_coleta': '#06b6d4', // Ciano (era azul)
  'saiu_para_entrega': '#a855f7', // Roxo (mantido)
  'entregue': '#22c55e',         // Verde (mantido)
  'problema': '#ef4444',         // Vermelho (mantido)
  'cancelada': '#ef4444',        // Vermelho (era cinza)
};

// Tooltip atualizado com velocidade
<Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
  <div className="text-xs min-w-[140px]">
    <div className="flex items-center gap-1 font-medium">
      <StatusIcon status={point.status} />
      <span>{label}</span>
    </div>
    <div className="text-gray-500 mt-0.5">
      {formatDateTime(point.tracked_at)}
    </div>
    {point.speed != null && (
      <div className="text-gray-600 mt-0.5">
        🚗 {point.speed.toFixed(0)} km/h
      </div>
    )}
    {point.observacao && (
      <div className="mt-1 text-gray-600 italic">
        💬 {point.observacao}
      </div>
    )}
    {isFirst && (
      <div className="mt-1 text-green-600 font-medium">📍 Início da viagem</div>
    )}
    {isLast && trackingPoints.length > 1 && (
      <div className="mt-1 text-blue-600 font-medium">📍 Posição atual</div>
    )}
  </div>
</Tooltip>
```

---

## Resultado Visual

Ao passar o mouse sobre cada pontinho:

```
┌─────────────────────────┐
│ 🚚 Saiu para Entrega    │  ← Status com ícone
│ 05/02/2026, 14:32       │  ← Horário
│ 🚗 65 km/h              │  ← Velocidade (novo!)
│ 💬 Parou para almoço    │  ← Observação (se houver)
│ 📍 Posição atual        │  ← Indicador especial
└─────────────────────────┘
```

