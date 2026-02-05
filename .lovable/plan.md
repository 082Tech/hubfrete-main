
## Objetivo
Ajustar o “hover” (tooltip) dos pontinhos do histórico de rastreamento (Leaflet) para mostrar telemetria completa: velocidade, horário e observações — sem depender do clique (Popup).

## O que encontrei no código atual
- O arquivo **`src/components/maps/TrackingHistoryMarkers.tsx`** já:
  - Busca `speed` e `observacao` do `tracking_historico` (campos existem no estado `TrackingPoint`).
  - Renderiza **Tooltip** no hover, mas hoje o Tooltip mostra somente **status + data/hora + Início/Atual**.
  - Renderiza **Popup** no clique e nele aparece `observacao`, porém **não aparece velocidade** e **não aparece observação no hover**.
- Em outros pontos do app (ex.: `GestaoLeafletMap.tsx` e `EntregasMap.tsx`) os Tooltips são usados com configurações de apresentação mais “fortes” (`opacity={1}`, classes, etc.). Isso é um bom padrão para copiarmos.

## Mudanças propostas (implementação)
### 1) Enriquecer o Tooltip dos pontos (hover)
No **`src/components/maps/TrackingHistoryMarkers.tsx`**, dentro do `<Tooltip>...</Tooltip>` de cada `<CircleMarker>`:
- Adicionar linhas para:
  - **Velocidade**: exibir “Velocidade: XX km/h” quando `point.speed != null`.
    - Formatação sugerida: `Math.round(point.speed)` (ou `point.speed.toFixed(0)`).
  - **Observação**: exibir bloco/linha quando `point.observacao` existir.
- Manter os indicadores de **Início** e **Atual**, mas com texto alinhado ao que você pediu (“Início da viagem” / “Posição atual”), se você quiser padronizar.

### 2) Fazer o Tooltip “segurar melhor” no hover (evitar sumir fácil)
Ainda no Tooltip do histórico, adicionar propriedades do `react-leaflet`/Leaflet Tooltip para melhorar usabilidade:
- `sticky` (o tooltip acompanha melhor o mouse enquanto você está sobre o ponto)
- `interactive` (permite interação/seleção sem fechar imediatamente)
- Ajustar `opacity` para `1` (mais legível e consistente com outros tooltips)

Observação: essas props dependem da versão do `react-leaflet`, mas no seu projeto já existe uso avançado de Tooltip em outros mapas; caso alguma dessas props não seja suportada pela tipagem, a alternativa é passar via `...`/cast ou usar `className` + apenas `opacity={1}` (eu vou seguir o caminho mais compatível com seu setup após checar o TypeScript na implementação).

### 3) (Opcional, mas recomendado) Levar a velocidade também para o Popup (clique)
Mesmo que o foco seja hover, é coerente o Popup também mostrar:
- velocidade (se disponível)
- observação (já mostra)
Isso evita inconsistência: hover mostra mais/menos que o clique.

### 4) Garantir que o hover não “brigue” com o caminhão
Você comentou “a não ser que o caminhão esteja em cima”.
Hoje o histórico é desenhado como `CircleMarker` e o caminhão é `Marker`. Em Leaflet, ordem de renderização e pane/zIndex podem fazer o caminhão capturar o hover.
Se acontecer na prática:
- Opção A (simples): aumentar a “hit area” do `CircleMarker` (ex.: `radius` um pouco maior) para facilitar hover.
- Opção B (mais precisa): definir `pane`/`zIndexOffset` ou usar `interactive={false}` no caminhão quando o usuário estiver no modo “ver histórico”, para priorizar os pontos.  
Eu só aplico isso se você confirmar que realmente está ocorrendo conflito de hover; senão, mantemos simples.

## Arquivos a alterar
- **`src/components/maps/TrackingHistoryMarkers.tsx`** (principal)
  - Tooltip: adicionar velocidade + observação + melhorar configuração de hover
  - (Opcional) Popup: incluir velocidade

## Critérios de aceite (como você valida no Preview)
1. Abrir um mapa que renderize o histórico:
   - `GestaoLeafletMap` (quando uma entrega está selecionada), ou
   - `DetailPanelLeafletMap`, ou
   - `EntregasMap` (quando seleciona uma entrega)
2. Passar o mouse em cima de um pontinho do histórico.
3. Tooltip aparece mostrando:
   - Status + horário
   - **Velocidade (km/h)** quando existir
   - **Observação** quando existir
   - Indicador de “Início da viagem” e “Posição atual” nos pontos correspondentes
4. Em pontos sem velocidade/observação, o tooltip não quebra layout (apenas omite os campos).

## Nota importante sobre “deploy do preview / github”
- O “Preview” atualiza automaticamente quando o código é salvo/compilado, mas pode precisar de refresh se o navegador estiver com cache/estado antigo.
- Envio para GitHub/publicação depende de você estar com a integração de GitHub habilitada ou usar o fluxo de **Publish** (se for Lovable Cloud).  
Na implementação, eu vou:
- Checar o console (erros de TypeScript/Leaflet) para garantir que o preview realmente consegue compilar.
- Se houver erro impedindo build (o que faz parecer “não fez deploy”), eu ajusto tipagens/props do Tooltip para uma versão compatível.

## Riscos / pontos de atenção técnicos
- `react-leaflet` Tooltip vs Radix Tooltip: aqui estamos usando corretamente `Tooltip` do `react-leaflet` (já importado de `react-leaflet`), então não vamos misturar com `src/components/ui/tooltip.tsx`.
- Tipagem de props (`sticky`, `interactive`): se o TS reclamar, ajustaremos para o conjunto suportado pela versão instalada, mantendo o comportamento de hover.

## Sequência de execução
1. Ajustar tooltip do histórico no `TrackingHistoryMarkers.tsx` para renderizar `speed` e `observacao`.
2. Melhorar comportamento de hover (opacity=1, sticky/interactive se compatível).
3. (Opcional) Replicar velocidade no Popup.
4. Validar no Preview navegando até uma tela com histórico e testando hover em 3–5 pontos.
