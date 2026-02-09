
## Transformar Gestao de Cargas do Embarcador em Kanban + Remover Manifesto

Duas mudancas na tela de Gestao de Cargas do portal do embarcador:

### 1. Remover logica de Manifesto (MDF-e)

- Remover a query secundaria que busca `viagem_entregas` + `viagens(manifesto_url)` (linhas 352-374)
- Remover campo `viagem_manifesto_url` da interface `EntregaData` e `manifesto_url`
- Contagem de documentos passa de `X/4` para `X/3` (NF-e, CT-e, Canhoto)
- Manter o alerta de NF-e pendente (badge ambar para status `aguardando` sem NF-e)

### 2. Layout Kanban (estilo Gestao de Entregas da transportadora)

Substituir o layout atual (mapa fullscreen com tabela flutuante e painel de controle) por um layout kanban de 3 colunas identico ao da transportadora, porem **apenas com visao de entregas** (sem switch de viagens).

A estrutura sera:

```text
+---------------------+---------------------+---------------------------+
|     Ativas (30%)    |  Finalizadas (30%)  |   Painel de Detalhes (40%) |
|                     |                     |                           |
| - Aguardando        | - Entregue          |  Mapa, status, docs,      |
| - Saiu p/ Coleta    | - Cancelada         |  motorista, acoes...       |
| - Saiu p/ Entrega   |                     |                           |
+---------------------+---------------------+---------------------------+
```

#### O que muda na pratica:

**Remove:**
- Layout fullscreen com mapa de fundo (`EntregasMap`)
- Painel de controle flutuante (stats, legenda, filtros no canto superior direito)
- Card flutuante de entrega selecionada no mapa
- Tabela flutuante na base ("Cargas em Rota")
- Logica de sidebar collapsed / posicionamento fixo
- Logica de `mapData` e `localizacaoMap`

**Adiciona:**
- Layout de 3 colunas (grid 30/30/40) que ocupa 100dvh
- `EntregaListItem` -- componente de card para listar entregas nas colunas (reutilizando o padrao da transportadora: avatar, rota, status, tempo decorrido)
- `DetailPanel` -- painel lateral direito com mapa do Leaflet, informacoes da carga, documentos (3/3), acoes de chat e status
- `EmptyColumnPlaceholder` -- placeholder para colunas vazias
- Header com titulo, botao de refresh e filtros avancados (`AdvancedFiltersPopover`)
- Separacao de entregas: coluna 1 = status ativos (`aguardando`, `saiu_para_coleta`, `saiu_para_entrega`), coluna 2 = terminais (`entregue`, `cancelada`)

**Busca de dados:** A query principal muda -- em vez de buscar por `cargas` com `entregas!inner`, buscara diretamente as `entregas` filtradas pela empresa do embarcador (via `cargas.filial_id`), trazendo os dados da carga embutidos. Isso simplifica a estrutura e alinha com o padrao da transportadora.

**Visao "diaria":** Entregas ativas sempre aparecem; entregas finalizadas (entregue/cancelada) permanecem visiveis se o `updated_at` for do dia atual, movendo-se automaticamente para o historico na virada do dia.

**Sem switch de viagens:** O embarcador nao precisa gerenciar viagens, entao nao havera switch nem logica de viagens.

### Detalhes tecnicos

**Arquivo principal:** `src/pages/portals/embarcador/GestaoCargas.tsx` -- reescrita completa do layout e query

**Componentes reutilizados da transportadora (mesmo padrao, adaptados):**
- `EntregaListItem` inline (card com avatar, rota origem-destino, status badge, tempo)
- `DetailPanel` inline (mapa Leaflet, dados da carga, documentos 3/3, acoes)
- `checkRequiredDocuments` (CT-e, Canhoto, NF-e -- sem manifesto)
- `AdvancedFiltersPopover` para filtros granulares
- `DetailPanelLeafletMap` para mapa no painel de detalhes
- `ChatSheet` para mensagens
- `FilePreviewDialog` para visualizacao de documentos

**Mudanca na query:** De `cargas -> entregas` para `entregas -> cargas`, filtrando por `cargas.filial_id = filialAtiva.id` e trazendo endereco_origem/destino e empresa via joins.

**Persistencia diaria:** Entregas com status terminal (`entregue`, `cancelada`) so aparecem se `updated_at >= startOfDay(now)`.
