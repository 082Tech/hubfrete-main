
# Plano de Implementação: Melhorias na Operação Diária

## Resumo das Alterações

Este plano implementa **4 melhorias principais** na tela de Operação Diária e no Dialog de Gestão de Entregas:

1. **Histórico de Eventos com Auditoria** - Registrar `user_id` e `user_nome` nas mudanças de status
2. **Cores Padronizadas de Status** - Unificar cores do dialog com a página principal
3. **Agrupamento por Viagem** - Substituir agrupamento por motorista por agrupamento por viagem
4. **Rotas Reais (OSRM)** - Usar API de rotas reais ao invés de linhas retas/curvas

---

## 1. Histórico de Eventos com Auditoria

**Problema Atual:**
O `statusMutation` registra eventos mas não inclui quem fez a alteração:
```typescript
await supabase.from('entrega_eventos').insert({
  entrega_id: entregaId,
  tipo: `status_${newStatus}`,
  timestamp: new Date().toISOString(),
  observacao: `Status alterado...`,
  // FALTA: user_id, user_nome
});
```

**Solução:**
```typescript
// Importar e usar o hook useAuth
const { user, profile } = useAuth();

// Na mutation:
await supabase.from('entrega_eventos').insert({
  entrega_id: entregaId,
  tipo: `status_${newStatus}`,
  timestamp: new Date().toISOString(),
  observacao: `Status alterado para ${statusConfig[newStatus]?.label}`,
  user_id: user?.id || null,
  user_nome: profile?.nome_completo || user?.email || 'Sistema',
});
```

---

## 2. Padronização das Cores de Status

**Problema Atual:**
No dialog, as bolinhas de status usam cores diferentes da página principal:
- Dialog: `bg-blue-500` para em rota (genérico)
- Página: `bg-cyan-500` para coleta, `bg-purple-500` para entrega

**Solução:**
Padronizar as cores em ambos os locais:

| Status | Cor Padrão |
|--------|------------|
| Aguardando | Amber (`#f59e0b`) |
| Saiu p/ Coleta | Cyan (`#06b6d4`) |
| Saiu p/ Entrega | Purple (`#a855f7`) |
| Entregue | Green (`#22c55e`) |
| Cancelada | Red (`#ef4444`) |

**Arquivos afetados:**
- `OperacaoDiaria.tsx` - Linha ~1031-1034 (bolinhas no dialog)
- `GestaoLeafletMap.tsx` - `StatusIndicators` (separar "Em Rota" em Coleta/Entrega)

---

## 3. Agrupamento por Viagem (ao invés de Motorista)

**Estrutura de Dados:**
```text
viagens (codigo: VGM-YYYY-NNNN)
   └── motorista_id → motoristas (nome_completo, foto_url)
   └── viagem_entregas
          └── entrega_id → entregas (codigo completo)
```

**UI Proposta:**
```text
┌─────────────────────────────────────┐
│  [Avatar]  José da Silva            │
│            VGM-2026-0002            │
│  ────────────────────────────       │
│  • ENT-2026-001234  SP → RJ   🟣    │
│  • ENT-2026-001235  SP → MG   🟢    │
└─────────────────────────────────────┘
```

**Mudanças Técnicas:**

1. **Alterar query para buscar viagens:**
```typescript
const { data: viagens } = await supabase
  .from('viagens')
  .select(`
    id, codigo, status,
    motorista:motoristas(id, nome_completo, foto_url),
    viagem_entregas(
      entrega:entregas(id, codigo, status, ...)
    )
  `)
  .eq('motorista.empresa_id', empresa.id);
```

2. **Estrutura de agrupamento:**
```typescript
interface ViagemGroup {
  id: string;
  codigo: string; // VGM-YYYY-NNNN
  motorista: { id: string; nome_completo: string; foto_url?: string };
  entregas: Entrega[];
  isOnline: boolean;
}
```

3. **Exibir código completo da entrega** (remover `.slice(-4)`):
```typescript
// ANTES
#{e.codigo?.slice(-4)}

// DEPOIS
{e.codigo}
```

---

## 4. Rotas Reais com OSRM

**Problema Atual:**
As rotas são desenhadas como linhas retas ou curvas artificiais usando `createCurvedPath()`.

**Solução:**
Criar hook `useOSRMRoute` para buscar rotas reais:

```typescript
// src/hooks/useOSRMRoute.ts
export function useOSRMRoute(
  origin: { lat: number; lng: number } | null,
  destination: { lat: number; lng: number } | null
) {
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!origin || !destination) {
      setRoute(null);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes?.[0]?.geometry?.coordinates) {
          // Converter [lng, lat] do OSRM para [lat, lng] do Leaflet
          const coords = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
          );
          setRoute(coords);
        }
      } catch (error) {
        console.error('OSRM fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return { route, loading };
}
```

**Integração nos mapas:**
- `DetailPanelLeafletMap.tsx` - Substituir `createCurvedPath` por `useOSRMRoute`
- `GestaoLeafletMap.tsx` - Mesma substituição

---

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|-----------|
| `src/hooks/useOSRMRoute.ts` | **CRIAR** - Hook para rotas OSRM |
| `src/pages/portals/transportadora/OperacaoDiaria.tsx` | Auditoria, agrupamento por viagem, cores |
| `src/components/maps/DetailPanelLeafletMap.tsx` | Integrar rotas OSRM |
| `src/components/maps/GestaoLeafletMap.tsx` | Integrar rotas OSRM, padronizar cores |

---

## Detalhes Técnicos

### Query para Viagens com Entregas

```typescript
// Buscar viagens ativas para a empresa
const { data: viagensData } = await supabase
  .from('viagens')
  .select(`
    id, 
    codigo, 
    status,
    motorista_id,
    motorista:motoristas!viagens_motorista_id_fkey(
      id, nome_completo, telefone, foto_url, empresa_id
    ),
    viagem_entregas(
      ordem,
      entrega:entregas(
        id, codigo, status, created_at, updated_at,
        peso_alocado_kg, valor_frete, coletado_em, entregue_em,
        cte_url, numero_cte, notas_fiscais_urls, manifesto_url, canhoto_url,
        carga:cargas(...)
      )
    )
  `)
  .not('status', 'eq', 'finalizada')
  .order('created_at', { ascending: false });

// Filtrar por motoristas da empresa
const viagens = viagensData?.filter(v => 
  v.motorista?.empresa_id === empresa.id
) || [];
```

### Cores Consistentes (Mapa de Status)

```typescript
const STATUS_COLORS = {
  aguardando: { bg: 'bg-amber-500', hex: '#f59e0b' },
  saiu_para_coleta: { bg: 'bg-cyan-500', hex: '#06b6d4' },
  saiu_para_entrega: { bg: 'bg-purple-500', hex: '#a855f7' },
  entregue: { bg: 'bg-green-500', hex: '#22c55e' },
  cancelada: { bg: 'bg-red-500', hex: '#ef4444' },
};
```

### Atualização dos Indicadores de Status no Mapa

```typescript
// StatusIndicators precisa separar coleta e entrega
<div className="flex items-center gap-1.5">
  <span className="w-3 h-3 rounded-full bg-amber-500" />
  <span className="text-xs">{statusCounts.aguardando}</span>
</div>
<div className="flex items-center gap-1.5">
  <span className="w-3 h-3 rounded-full bg-cyan-500" />
  <span className="text-xs">{statusCounts.coleta}</span>
</div>
<div className="flex items-center gap-1.5">
  <span className="w-3 h-3 rounded-full bg-purple-500" />
  <span className="text-xs">{statusCounts.entrega}</span>
</div>
```

---

## Fluxo de Dados Atualizado

```text
┌─────────────────────────────────────────────────────────────┐
│                    OperacaoDiaria.tsx                       │
├─────────────────────────────────────────────────────────────┤
│  useQuery('operacao-diaria')                                │
│      ↓                                                      │
│  Busca viagens → motoristas → viagem_entregas → entregas    │
│      ↓                                                      │
│  Agrupa por viagem (VGM-XXXX)                               │
│      ↓                                                      │
│  GestaoEntregasDialogContent                                │
│      └── Lista viagens com avatar do motorista              │
│      └── Cada viagem expande para mostrar entregas          │
│      └── Códigos completos (não abreviados)                 │
│      └── Cores padronizadas                                 │
│                                                             │
│  statusMutation                                             │
│      └── Registra user_id + user_nome em entrega_eventos    │
│                                                             │
│  DetailPanelLeafletMap / GestaoLeafletMap                   │
│      └── useOSRMRoute para rotas reais                      │
└─────────────────────────────────────────────────────────────┘
```
