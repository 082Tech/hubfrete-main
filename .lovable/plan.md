

## Ajuste da Gestao de Cargas: Visao centrada em Cargas para o Embarcador

### Problema atual
A tela de Gestao de Cargas do embarcador esta muito centrada no **motorista** -- o item da lista destaca o nome do motorista, e a Visualizacao Geral em Mapa agrupa tudo por motorista. O embarcador precisa de uma visao centrada na **carga** (qual e o carregamento, qual a carga mae), com o motorista como informacao complementar.

Alem disso, o tracking history (historico de rastreamento) no mapa do painel de detalhes precisa ser verificado e garantido.

---

### Mudancas planejadas

#### 1. Lista de entregas (colunas Ativas/Finalizadas) -- foco na carga
- Reorganizar o `EntregaListItem` para destacar a **carga** como informacao principal:
  - **Linha 1**: Codigo da carga (ex: `CRG-2026-0042`) + badge de status
  - **Linha 2**: Rota (Cidade Origem -> Cidade Destino)
  - **Linha 3**: Remetente / Destinatario
  - **Linha 4**: Descricao da carga + peso
  - **Rodape**: Avatar pequeno do motorista com nome (como info secundaria), valor do frete
- O avatar do motorista passa de destaque principal para um icone menor no rodape do card

#### 2. Painel de detalhes -- garantir tracking history
- Verificar que o `DetailPanelLeafletMap` esta recebendo `entregaId` corretamente (ja recebe, mas garantir que o fluxo `entrega -> viagem_entregas -> tracking_historico` funcione)
- Adicionar destaque visual ao codigo da **carga mae** no header do painel (ex: badge maior com "CRG-2026-XXXX" + descricao)
- Reorganizar a hierarquia: Carga primeiro, motorista depois

#### 3. Visualizacao Geral em Mapa -- agrupar por Carga
- Trocar o agrupamento do painel lateral de **"Motoristas"** para **"Cargas"**
- Cada grupo sera uma carga (codigo + descricao + rota)
- Dentro de cada carga, listar as entregas associadas com status
- Manter foto do motorista como info secundaria dentro de cada entrega
- O titulo do painel muda de "Motoristas (N)" para "Cargas (N)"
- A busca filtra por codigo da carga, cidade, remetente/destinatario

---

### Detalhes tecnicos

#### `EntregaListItem` (linhas 107-183 de GestaoCargas.tsx)
- Trocar a hierarquia visual: Package icon + codigo da carga como titulo
- Motorista passa para uma linha menor com avatar 6x6 (em vez de 9x9)
- Manter todos os dados, apenas reordenar prioridade visual

#### `GestaoMapDialogContent` (linhas 591-818 de GestaoCargas.tsx)
- Refatorar `motoristaGroups` para `cargaGroups`: agrupar entregas por `carga.id`
- Cada grupo mostra: codigo da carga, rota, descricao, e lista de entregas
- Motorista aparece como sub-info dentro de cada entrega no grupo
- Adaptar `GestaoLeafletMap` props se necessario para o novo agrupamento

#### `DetailPanel` (linhas 196-588 de GestaoCargas.tsx)
- Mover a secao da carga (descricao, peso, tipo) para logo abaixo do header, antes do mapa
- Garantir que `entregaId` e passado ao `DetailPanelLeafletMap` (ja e feito na linha 311)
- O tracking history depende de existir um registro em `viagem_entregas` -- isso e esperado e correto

#### Arquivos modificados
- `src/pages/portals/embarcador/GestaoCargas.tsx` (principal -- EntregaListItem, DetailPanel, GestaoMapDialogContent)
- `src/components/maps/GestaoLeafletMap.tsx` (ajustar props se o agrupamento mudar de motorista para carga)

