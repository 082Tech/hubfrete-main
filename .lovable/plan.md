

# Adicionar Motorista Padrão nos Vínculos + Auto-preenchimento no Wizard

## Contexto
Atualmente, os cards de vínculo na aba "Vínculos" da Minha Frota mostram apenas Veículo + Carrocerias. O usuário quer adicionar um slot de motorista padrão a cada veículo, e usar isso para auto-preencher o wizard de aceite de carga.

## Mudanças

### 1. Banco de Dados -- Nova coluna `motorista_padrao_id` em `veiculos`

Adicionar coluna `motorista_padrao_id` (uuid, nullable, FK para `motoristas.id`) na tabela `veiculos`. Essa coluna representa o motorista que normalmente opera aquele veículo, sem bloqueios operacionais.

### 2. Minha Frota -- Slot de Motorista no Card de Vínculos

Cada card de vínculo ganhará um slot de motorista acima das carrocerias:
- Avatar redondo com foto do motorista ou fallback com iniciais
- Nome + telefone
- Botão de desvincular (Unlink)
- Se vazio: dropdown para selecionar motorista (lista motoristas da empresa sem vínculo padrão com outro veículo)
- O info banner será atualizado: "Vínculos Motorista + Veículo + Carroceria"

### 3. Wizard de Aceite -- Auto-preenchimento em cadeia

**Ao selecionar motorista (sem viagem ativa)**:
- Buscar se existe algum veículo com `motorista_padrao_id` = motorista selecionado
- Se sim: auto-preencher `selectedVeiculo` com esse veículo
- As carrocerias vinculadas a esse veículo (`carrocerias.veiculo_id`) serão auto-preenchidas automaticamente (lógica que ja existe parcialmente)

**Ao trocar veículo manualmente**:
- Buscar carrocerias vinculadas ao novo veículo (`carrocerias.veiculo_id = novoVeiculoId`)
- Auto-preencher `selectedCarroceria` / `selectedCarroceriasMulti` com essas carrocerias
- Limpar peso alocado

**Motorista com viagem ativa**: comportamento atual permanece (equipamento bloqueado da viagem).

### Detalhes Tecnico

**Migration SQL:**
```text
ALTER TABLE veiculos ADD COLUMN motorista_padrao_id uuid REFERENCES motoristas(id);
```

**MinhaFrota.tsx -- Aba Vinculos (linhas ~2330-2435):**
- Incluir query de motoristas da empresa (reutilizar query existente ou adicionar)
- Acima do separador de carrocerias, adicionar seção "Motorista padrão" com Avatar + Select
- Operações: `supabase.from('veiculos').update({ motorista_padrao_id })` para vincular/desvincular

**CargasDisponiveis.tsx -- useEffect apos selectedMotorista (linhas ~535-559):**
- Adicionar bloco: se `!driverActiveTrip`, buscar veículo onde `motorista_padrao_id = selectedMotorista`
- Se encontrado, chamar `setSelectedVeiculo(veiculo.id)`

**CargasDisponiveis.tsx -- novo useEffect para selectedVeiculo:**
- Quando `selectedVeiculo` muda e nao ha viagem ativa bloqueando:
  - Buscar carrocerias com `veiculo_id = selectedVeiculo`
  - Auto-preencher single ou multi conforme tipo do veículo
  - Limpar peso

**Queries afetadas:**
- Query de veículos em MinhaFrota precisa incluir `motorista_padrao_id` e join com motoristas para foto/nome
- Query de veículos em CargasDisponiveis precisa incluir `motorista_padrao_id`

