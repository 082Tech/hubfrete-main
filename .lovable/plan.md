## Plano: Gestão de Cargos + Melhorias UX Torre de Controle

### Parte 1: Tela de Gestão de Cargos (super_admin only)

**Migração DB:**
- Criar tabela `cargo_permissoes` para armazenar permissões configuráveis por cargo
  - `id`, `escopo` (torre | sistema), `cargo` (text), `descricao` (text), `permissao` (text — ex: `financeiro.baixa`, `cargas.editar`), `permitido` (boolean)
- Criar tabela `cargos_config` para armazenar os cargos customizados
  - `id`, `escopo` (torre | sistema), `nome` (text unique por escopo), `descricao` (text), `editavel` (boolean default true), `created_at`
- Seed com cargos existentes: Torre (super_admin, admin, suporte) e Sistema (ADMIN, OPERADOR)
- RLS: apenas super_admin pode ler/escrever

**Frontend:**
- Nova página `/admin/cargos` — `CargosAdmin.tsx`
- Tabs: "Torre de Controle" | "Sistema HubFrete"
- Cada tab mostra os cargos com suas descrições e lista de permissões (toggle on/off)
- Botão "Novo Cargo" para criar cargos adicionais
- Apenas super_admin vê o menu item na sidebar
- Controle funcional: usar `cargo_permissoes` para bloquear ações (ex: suporte não pode dar baixa no financeiro)

**Permissões pré-definidas:**
- Torre: `financeiro.visualizar`, `financeiro.baixa`, `empresas.editar`, `empresas.excluir`, `pre_cadastros.aprovar`, `logs.visualizar`, `relatorios.exportar`, `usuarios.gerenciar`, `cargos.gerenciar`
- Sistema: `cargas.criar`, `cargas.editar`, `entregas.finalizar`, `financeiro.visualizar`, `usuarios.convidar`, `configuracoes.editar`

### Parte 2: Melhorias UX nas Telas de Listagem

**Telas que precisam de melhorias (verificar cada uma):**
1. `Chamados` — adicionar paginação e DateRangePicker
2. `VeiculosAdmin` — verificar busca/paginação
3. `CarroceriasAdmin` — verificar busca/paginação
4. `AjudantesAdmin` — verificar busca/paginação
5. `CargasAdmin` — já tem filtros, verificar paginação
6. `EntregasAdmin` — já tem filtros, verificar paginação
7. `MotoristasAdmin` — já tem busca/paginação
8. `Empresas` — já tem busca/paginação
9. `Financeiro` — verificar DateRangePicker
10. `Logs` — verificar busca/paginação
11. `DocumentosValidacao` — verificar
12. `PreCadastros` — verificar

**Padrão a aplicar em cada tela:**
- Input de busca (Search) no topo
- Paginação com o componente `Pagination` existente
- DateRangePicker para filtro de período (onde aplicável)
- Filtros de status via Select

### Parte 3: Enforcement de Permissões

- Criar hook `useAdminPermission(permissao: string)` que consulta `cargo_permissoes` 
- Aplicar no Financeiro: botão de baixa desabilitado para suporte
- Aplicar nas demais áreas conforme permissões configuradas
