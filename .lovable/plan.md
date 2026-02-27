
# Refatorar Wizard de Aceite de Carga (Etapas 2 e 3)

## Problema Atual
- Seleção de motorista, veículo e carroceria são dropdowns simples sem fotos/placas visuais
- O peso por carroceria fica na etapa 3, separado da seleção de carroceria (etapa 2)
- Etapa 3 mistura peso, previsão de coleta e viagem -- deveria ser apenas revisão

## Mudanças Planejadas

### Etapa 2 -- Motorista + Equipamento + Peso

**Motorista** (melhorar visual):
- Manter o campo de busca atual mas melhorar os itens do dropdown: foto maior, nome em destaque, telefone visível, badge de status (Disponivel / Em Viagem VGM-XXX)
- Ao selecionar, exibir card visual com foto, nome, telefone e status

**Veiculo** (melhorar visual):
- No dropdown de seleção, mostrar foto thumbnail (se houver) + placa em destaque + tipo + capacidade
- Ao selecionar, exibir card com foto do veículo, placa em badge, tipo e capacidade

**Carroceria + Peso (juntar na etapa 2)**:
- Mover a entrada de peso para junto da seleção de carroceria
- Para veículos de carroceria integrada: mostrar capacidade e campo de peso direto
- Para 1 carroceria: ao selecionar, mostrar card com placa em badge, tipo, capacidade e campo de peso. Se for unica, auto-preencher o peso maximo
- Para multi-carrocerias (bitrem/rodotrem): manter o layout atual de slots, cada um com seu campo de peso (ja funciona assim)
- Previsão de coleta tambem fica na etapa 2

### Etapa 3 -- Revisão (somente leitura)

Transformar a etapa 3 em uma tela de revisão com todos os dados consolidados:
- Resumo da carga (codigo, descricao, peso)
- Motorista selecionado (foto + nome)
- Veiculo (foto + placa + tipo)
- Carroceria(s) com peso por carroceria
- Previsão de coleta
- Viagem (ViagemSelector permanece aqui para decidir se cria nova ou adiciona a existente)
- Simulação visual: peso restante na carga + valor do frete
- Botão "Confirmar Aceite"

### Detalhes Tecnicos

**Arquivo**: `src/pages/portals/transportadora/CargasDisponiveis.tsx`

**Etapa 2 (linhas ~2046-2570)**:
- Manter toda a logica de motorista, veiculo e carroceria
- Adicionar thumbnails de foto nos cards de seleção usando `foto_url` (ja disponivel nas queries)
- Mover o bloco de peso (linhas ~2586-2690) e previsão de coleta (linhas ~2665-2681) para dentro da etapa 2, posicionado abaixo da seleção de carroceria
- Para single carroceria sem viagem ativa: auto-preencher peso com `pesoMaximoAlocar`

**Etapa 3 (linhas ~2572-2767)**:
- Substituir todo o conteudo por cards de revisão somente-leitura
- ViagemSelector permanece interativo
- Manter os paineis de simulação (peso restante + frete) como estão

**Header do dialog (linhas ~1813-1816)**:
- Atualizar descrições: Etapa 2 = "Equipamento, motorista e peso" / Etapa 3 = "Revisão e confirmação"

**Footer (linhas ~2784-2787)**:
- Ajustar validação do botão "Proximo" na etapa 2 para incluir peso valido e previsão de coleta
