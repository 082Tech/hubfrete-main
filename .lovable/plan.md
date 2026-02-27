
# Reestruturar Alocacao de Equipamento: Vinculos Flexiveis por Viagem

## Resumo

Mudar o modelo de alocacao de equipamento de "vinculo fixo motorista-veiculo-carroceria" para "alocacao por viagem/carga". Isso envolve 3 grandes mudancas:

1. **Remover vinculos fixos** do dialog de motoristas
2. **Redesenhar o dialog de aceite de carga** em etapas (wizard) com selecao independente de veiculo, carroceria e motorista
3. **Criar tela de Painel de Frota** para visibilidade operacional (quem esta com o que, disponibilidade)

---

## Parte 1: Remover Vinculos Fixos

### O que muda
- Remover a opcao "Gerenciar Vinculos" do dropdown de acoes na tela de Motoristas (`Motoristas.tsx`)
- Remover o componente `MotoristaVinculosDialog.tsx` (ou manter apenas como consulta historica)
- Na tela de Motoristas, a coluna "Equipamentos" passa a mostrar o equipamento da **viagem ativa** do motorista (se houver), em vez do vinculo fixo
- O cadastro de motorista (`MotoristaFormDialog`) nao exigira mais vinculo com veiculo/carroceria nas etapas de cadastro

### Importante
- As colunas `motorista_id` nas tabelas `veiculos` e `carrocerias` continuam existindo no banco, porem deixam de ser gerenciadas como "vinculo permanente". Elas passam a refletir a **ultima alocacao** ou podem ser ignoradas em favor dos dados da viagem.

---

## Parte 2: Redesenhar Dialog de Aceite de Carga (Wizard em Etapas)

### Fluxo atual (tudo em uma tela so)
O dialog atual mostra detalhes da carga + selecao de motorista + equipamento vinculado ao motorista + viagem + peso, tudo em um scroll longo.

### Novo fluxo (wizard em 3-4 etapas)

**Etapa 1 - Detalhes da Carga**
- Mostra todas as informacoes da carga (origem, destino, mapa, requisitos, peso, frete)
- Botao "Proximo" para avancar

**Etapa 2 - Selecao de Equipamento**
- Selecao de Veiculo: lista TODOS os veiculos ativos da empresa (nao apenas os vinculados a um motorista)
  - Mostra capacidade disponivel (descontando entregas ativas naquele veiculo)
  - Filtra automaticamente por requisitos da carga (tipo de veiculo)
- Selecao de Carroceria: se o veiculo nao tem carroceria integrada, lista TODAS as carrocerias ativas da empresa
  - Filtra por requisitos da carga (tipo de carroceria)
  - Suporte multi-carroceria para Bitrem/Rodotrem (ja existe)
- Botao "Proximo"

**Etapa 3 - Selecao de Motorista**
- Lista todos os motoristas ativos da empresa
- Mostra status: disponivel, em viagem, etc.
- Combobox com busca (reutilizar componente existente)
- Selecao de viagem (ViagemSelector existente)
- Botao "Proximo"

**Etapa 4 - Confirmacao**
- Resumo visual: Carga + Veiculo + Carroceria + Motorista + Peso + Frete
- Input de peso a carregar
- Input de previsao de coleta
- Simulacao de frete e peso restante (ja existe)
- Botao "Confirmar Aceite"

### Mudancas tecnicas
- Fetch de veiculos e carrocerias passa a buscar TODOS da empresa (nao filtra por `motorista_id`)
- Calculo de capacidade disponivel usa `pesoEmUsoPorVeiculo` e `pesoEmUsoPorCarroceria` (ja existem)
- Validacao: veiculo e carroceria devem estar disponiveis (nao em manutencao, etc.)

---

## Parte 3: Nova Tela - Painel de Frota (Alocacao Operacional)

### Onde fica
- Nova rota no portal da Transportadora (ex: `/transportadora/painel-frota`)
- Novo item no sidebar, pode ficar proximo a "Minha Frota"

### O que mostra

**Visao principal: Tabela/Grid de Veiculos**
- Cada veiculo com: placa, tipo, foto, capacidade total
- Motorista atual (da viagem ativa, se houver)
- Carroceria(s) atual(is) (da viagem ativa)
- Status: Disponivel / Em Viagem / Em Manutencao
- % de ocupacao (peso alocado / capacidade)
- Barra de progresso visual da ocupacao

**Filtros**
- Por status (disponivel, em viagem, manutencao)
- Por tipo de veiculo
- Busca por placa

**Dados vem de**
- Tabela `veiculos` + `carrocerias` (cadastro)
- Tabela `viagens` (viagens ativas com `motorista_id`, `veiculo_id`, `carroceria_id`)
- Tabela `entregas` (peso alocado por veiculo/carroceria)

---

## Detalhes Tecnicos

### Arquivos a criar
- `src/pages/portals/transportadora/PainelFrota.tsx` - nova tela de painel

### Arquivos a modificar
- `src/pages/portals/transportadora/CargasDisponiveis.tsx` - refatorar dialog de aceite para wizard em etapas, buscar veiculos/carrocerias da empresa inteira
- `src/pages/portals/transportadora/Motoristas.tsx` - remover opcao "Gerenciar Vinculos" do dropdown, atualizar coluna "Equipamentos"
- `src/components/portals/PortalSidebar.tsx` - adicionar link para Painel de Frota
- `src/App.tsx` - adicionar rota `/transportadora/painel-frota`
- `src/components/motoristas/MotoristaFormDialog.tsx` - remover etapas obrigatorias de vinculo veiculo/carroceria no cadastro

### Sem mudancas no banco de dados
- As tabelas `veiculos` e `carrocerias` ja possuem `empresa_id` para filtrar por empresa
- A tabela `viagens` ja possui `veiculo_id`, `carroceria_id`, `motorista_id` para rastrear alocacao por viagem
- Nenhuma migration necessaria

### Ordem de implementacao
1. Modificar o dialog de aceite para wizard em etapas (maior impacto)
2. Limpar vinculos fixos da tela de Motoristas
3. Criar a tela Painel de Frota
4. Adicionar rota e sidebar
