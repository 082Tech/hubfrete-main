

# Analise Automatica de Carrocerias por Tipo de Veiculo

## Contexto: Tipos de Veiculos do Mercado Brasileiro

Com base nos tipos cadastrados no sistema (`tipo_veiculo` enum) e na realidade operacional brasileira, a classificacao de quantas carrocerias cada tipo aceita e:

### Veiculos com carroceria integrada (0 selects de carroceria)
- **VUC** (Veiculo Urbano de Carga) - bau integrado
- **3/4** (`tres_quartos`) - chassi com carroceria fixa
- **Toco** - eixo simples, carroceria fixa no chassi
- **Truck** - dois eixos traseiros, carroceria fixa no chassi

### Veiculos com 1 carroceria (1 select)
- **Carreta** - cavalo mecanico + 1 semirreboque
- **Carreta LS** (`carreta_ls`) - cavalo mecanico + 1 semirreboque LS
- **Vanderleia** (`vanderleia`) - cavalo mecanico + 1 semirreboque extensivel

### Veiculos com 2 carrocerias (2 selects + peso por carroceria)
- **Bitrem** - cavalo mecanico + 2 semirreboques articulados
- **Bitruck** - chassi com 2 eixos traseiros + 2 corpos de carga

### Veiculos com 3 carrocerias (3 selects + peso por carroceria)
- **Rodotrem** - cavalo mecanico + 3 semirreboques (ou 2 maiores, mas o padrao e suportar ate 3)

## O que muda no codigo

### 1. Criar helper `getMaxCarrocerias(tipoVeiculo)`

Uma funcao utilitaria que retorna o numero maximo de slots de carroceria com base no tipo do veiculo:

```text
vuc, tres_quartos, toco, truck -> 0 (carroceria integrada)
carreta, carreta_ls, vanderleia -> 1
bitrem, bitruck               -> 2
rodotrem                       -> 3
```

**Importante**: Essa funcao substitui a checagem manual de `carroceria_integrada` e a checagem `tipo === 'bitrem' || tipo === 'rodotrem'`. O campo `carroceria_integrada` do banco continua sendo respeitado como override, mas a logica principal vem do mapeamento por tipo.

### 2. Refatorar a UI de carroceria na Etapa 2 do Wizard

**Quando `maxCarrocerias === 0`** (carroceria integrada):
- Mostrar mensagem "Carroceria integrada ao veiculo" com a capacidade do veiculo
- Nenhum select

**Quando `maxCarrocerias === 1`**:
- 1 Select de carroceria (como ja funciona hoje para carreta)
- Peso informado no campo geral (etapa 3)

**Quando `maxCarrocerias >= 2`** (bitrem, bitruck, rodotrem):
- Renderizar exatamente `maxCarrocerias` selects de carroceria (nao checkboxes)
- Cada select e independente: "Carroceria 1", "Carroceria 2", "Carroceria 3"
- Abaixo de cada select, um input de peso: "Peso na Carroceria 1 (kg)"
- Validacao: nao permitir selecionar a mesma carroceria em dois slots
- Validacao: peso por carroceria nao pode exceder a capacidade individual
- Mostrar capacidade de cada carroceria selecionada como referencia

### 3. Remover `isMultiTrailer` memo

Substituir por:
```
const maxCarrocerias = useMemo(() => getMaxCarrocerias(selectedVeiculoData?.tipo), [selectedVeiculoData]);
```

### 4. Ajustar calculo de peso total

- `pesoTotalAlocado`: quando `maxCarrocerias >= 2`, somar todos os `pesoPorCarroceria` dos slots preenchidos
- `capacidadeEquipamentoTotal`: somar capacidade de todas as carrocerias selecionadas
- `capacidadeEquipamentoEmUso`: somar peso em uso de todas as carrocerias selecionadas

### 5. Ajustar estado `selectedCarroceriasMulti`

Mudar de array livre para array de tamanho fixo baseado em `maxCarrocerias`:
- `selectedCarrocerias: (string | null)[]` com length = maxCarrocerias
- Exemplo bitrem: `[carroceriaId1, carroceriaId2]`
- Exemplo rodotrem: `[carroceriaId1, carroceriaId2, carroceriaId3]`

## Arquivo a modificar

- `src/pages/portals/transportadora/CargasDisponiveis.tsx`

## Resumo visual do resultado

```text
Veiculo: Bitrem selecionado
  -> Aparece automaticamente:
     [Select Carroceria 1 v]  Peso: [___] kg  (Cap: 30.000 kg)
     [Select Carroceria 2 v]  Peso: [___] kg  (Cap: 28.000 kg)

Veiculo: Rodotrem selecionado
  -> Aparece automaticamente:
     [Select Carroceria 1 v]  Peso: [___] kg  (Cap: 25.000 kg)
     [Select Carroceria 2 v]  Peso: [___] kg  (Cap: 25.000 kg)
     [Select Carroceria 3 v]  Peso: [___] kg  (Cap: 24.000 kg)

Veiculo: Carreta selecionado
  -> Aparece:
     [Select Carroceria v]

Veiculo: Truck selecionado
  -> Aparece:
     "Carroceria integrada ao veiculo - Capacidade: 16.000 kg"
```
