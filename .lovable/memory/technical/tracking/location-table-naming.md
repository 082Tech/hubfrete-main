# Memory: technical/tracking/location-table-naming
Updated: now

A tabela de rastreamento em tempo real é `locations` (inglês). As colunas também foram renomeadas para inglês:
- `precisao` → `accuracy`
- `velocidade` → `speed`
- `bussola_pos` → `heading`

Todas as consultas, hooks (como `useRealtimeLocalizacoes`) e assinaturas Realtime devem referenciar:
- Tabela: `locations`
- Colunas: `motorista_id`, `latitude`, `longitude`, `timestamp`, `altitude`, `accuracy`, `speed`, `heading`

O app Flutter envia dados neste formato, garantindo compatibilidade total.
