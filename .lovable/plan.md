
# Plano: Veículos com Carroceria Integrada

## Contexto do Problema

Atualmente, o sistema trata todos os veículos como "cavalos" (tratores) que precisam de uma carroceria separada para transportar carga. Porém, na realidade do transporte brasileiro, existem dois cenários:

1. **Veículos com carroceria separada (atual)**: Carreta + Semi-reboque, Bitrem, etc. - têm duas placas distintas
2. **Veículos com carroceria integrada (novo)**: Toco, Truck, VUC, 3/4 - a carroceria faz parte do veículo, uma placa só

O peso/capacidade de carregamento sempre pertence à carroceria, seja ela integrada ou separada.

---

## Solucao Proposta

### 1. Alteracao no Banco de Dados

Adicionar nova coluna na tabela `veiculos`:

```sql
ALTER TABLE veiculos 
ADD COLUMN carroceria_integrada BOOLEAN DEFAULT false;
```

**Logica de negocio:**
- Quando `carroceria_integrada = true`: o veiculo ja possui capacidade propria (usa campos `capacidade_kg` e `capacidade_m3` do proprio veiculo)
- Quando `carroceria_integrada = false`: o veiculo eh apenas cavalo, precisa de carroceria separada da tabela `carrocerias`

**Tipos de veiculo que tipicamente tem carroceria integrada:**
- VUC
- 3/4 (tres_quartos)
- Toco
- Truck
- Bitruck

**Tipos de veiculo que tipicamente precisam carroceria separada:**
- Carreta
- Carreta LS
- Bitrem
- Rodotrem
- Vanderleia

---

### 2. Alteracoes na Interface - Minha Frota

**Arquivo:** `src/pages/portals/transportadora/MinhaFrota.tsx`

No formulario de cadastro de veiculo:
- Adicionar switch/toggle "Carroceria Integrada"
- Quando ativado, exibir campos de capacidade (kg e m3) e tipo de carroceria
- Quando desativado, ocultar esses campos (veiculo eh apenas cavalo)
- Pre-selecionar baseado no tipo de veiculo escolhido

No card de veiculo:
- Exibir badge indicando se eh "Carroceria Integrada" ou "Apenas Cavalo"
- Mostrar capacidade diretamente no card quando integrada

---

### 3. Alteracoes no Dialog de Edicao de Veiculo

**Arquivo:** `src/components/frota/VeiculoEditDialog.tsx`

- Adicionar campo switch "Carroceria Integrada"
- Mostrar/ocultar campos de capacidade e tipo de carroceria conforme selecionado
- Validar que se tem carroceria integrada, capacidade eh obrigatoria

---

### 4. Alteracoes no Cadastro de Motorista

**Arquivo:** `src/components/motoristas/steps/EtapaVeiculo.tsx`

Ajustar a etapa de vinculo de equipamento:
- Se o veiculo selecionado tem `carroceria_integrada = true`, nao exigir selecao de carroceria separada
- Exibir informacao de capacidade do proprio veiculo
- Se `carroceria_integrada = false`, manter logica atual de selecao de carroceria da tabela `carrocerias`

---

### 5. Alteracoes na Aceitacao de Cargas

**Arquivo:** `src/pages/portals/transportadora/CargasDisponiveis.tsx`

Ajustar calculo de capacidade disponivel:
- Para motoristas com veiculo de carroceria integrada: usar `veiculo.capacidade_kg`
- Para motoristas com carroceria separada: usar soma de `carrocerias.capacidade_kg`
- Na selecao de motorista, mostrar capacidade correta baseado no tipo de equipamento

**Logica atual (linhas ~470-484):**
```typescript
const capacidadeCarroceriaTotal = useMemo(() => {
  if (!selectedMotoristaData?.carrocerias?.length) return 0;
  return selectedMotoristaData.carrocerias.reduce((acc, c) => acc + (c.capacidade_kg || 0), 0);
}, [selectedMotoristaData]);
```

**Nova logica:**
```typescript
const capacidadeTotal = useMemo(() => {
  if (!selectedMotoristaData) return 0;
  
  // Verificar se tem veiculo com carroceria integrada
  const capacidadeVeiculoIntegrado = selectedMotoristaData.veiculos
    ?.filter(v => v.carroceria_integrada)
    ?.reduce((acc, v) => acc + (v.capacidade_kg || 0), 0) || 0;
  
  // Capacidade de carrocerias separadas
  const capacidadeCarrocerias = selectedMotoristaData.carrocerias
    ?.reduce((acc, c) => acc + (c.capacidade_kg || 0), 0) || 0;
  
  return capacidadeVeiculoIntegrado + capacidadeCarrocerias;
}, [selectedMotoristaData]);
```

---

### 6. Alteracoes nos Types

**Arquivo:** `src/components/motoristas/types.ts`

Adicionar campo nos tipos:
```typescript
interface VeiculoSimples {
  // ... campos existentes
  carroceria_integrada: boolean;
  capacidade_kg: number | null;
  capacidade_m3: number | null;
}
```

**Arquivo:** `src/integrations/supabase/types.ts`

Sera atualizado automaticamente apos a migration.

---

### 7. Remocao de Capacidade Duplicada

Atualmente, veiculos tem campos `capacidade_kg` e `capacidade_m3` que sao usados incorretamente em alguns lugares. Com esta mudanca:

- `veiculos.capacidade_kg/m3`: usado APENAS quando `carroceria_integrada = true`
- `carrocerias.capacidade_kg/m3`: usado quando veiculo tem carroceria separada

**Locais a ajustar:**
- VeiculoEditDialog: condicionar exibicao dos campos
- MinhaFrota: condicionar exibicao nos cards
- CargasDisponiveis: usar logica unificada de capacidade

---

## Resumo das Alteracoes

| Arquivo | Tipo de Alteracao |
|---------|-------------------|
| Nova migration SQL | Adicionar coluna `carroceria_integrada` |
| MinhaFrota.tsx | Form de cadastro + cards |
| VeiculoEditDialog.tsx | Campo switch + logica condicional |
| EtapaVeiculo.tsx | Vinculo condicional de carroceria |
| CargasDisponiveis.tsx | Calculo unificado de capacidade |
| types.ts | Novos campos no tipo VeiculoSimples |

---

## Fluxo do Usuario

### Cadastrando um Toco com bau integrado:
1. Vai em Minha Frota > Novo Veiculo
2. Seleciona tipo "Toco"
3. Sistema pre-marca "Carroceria Integrada"
4. Preenche tipo de carroceria (ex: Bau) e capacidade (ex: 8.000 kg)
5. Salva - veiculo fica com carroceria integrada

### Cadastrando uma Carreta:
1. Vai em Minha Frota > Novo Veiculo
2. Seleciona tipo "Carreta"
3. Sistema desmarca "Carroceria Integrada"
4. Nao exibe campos de capacidade (sera da carroceria separada)
5. Salva veiculo
6. Vai em aba Carrocerias > Nova Carroceria
7. Cadastra semi-reboque com placa e capacidade

### Vinculando ao motorista:
1. Edita motorista > Etapa Veiculo
2. Seleciona veiculo
3. Se carroceria integrada: mostra capacidade do veiculo, nao pede carroceria
4. Se apenas cavalo: pede selecao de carroceria da lista

### Aceitando carga:
1. Sistema calcula capacidade do conjunto corretamente
2. Motorista com Toco integrado: usa capacidade do veiculo
3. Motorista com Carreta + Semi-reboque: usa capacidade da carroceria
