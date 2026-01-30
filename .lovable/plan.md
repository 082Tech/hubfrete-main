
# Plano de Implementação - Funcionalidades Avançadas da Torre de Controle

## Visão Geral

Este plano detalha a implementação de 6 módulos avançados para a Torre de Controle administrativa, indo além do CRUD básico para fornecer insights operacionais, monitoramento em tempo real e automação de processos.

---

## Fase 1: Monitoramento em Tempo Real (Prioridade Alta)

### Objetivo
Transformar a página de Monitoramento (atualmente placeholder) em um painel completo com mapa interativo, rastreamento de veículos e visualização de geofences.

### Funcionalidades
- **Mapa Interativo**: Visualização de todos os motoristas ativos com posição em tempo real
- **Sidebar de Motoristas**: Lista lateral com status online/offline e última localização
- **Geofences**: Exibição visual das cercas geográficas configuradas (coleta/entrega)
- **Histórico de Rota**: Replay do trajeto de um motorista selecionado
- **Filtros**: Por empresa, status, região

### Componentes a Criar
```
src/pages/admin/Monitoramento.tsx (reescrever)
src/components/admin/monitoring/MonitoringMap.tsx
src/components/admin/monitoring/DriverListPanel.tsx
src/components/admin/monitoring/GeofenceOverlay.tsx
src/components/admin/monitoring/RoutePlayback.tsx
```

### Dados Utilizados
- `localizações` - Posições GPS dos motoristas
- `geofences` - Cercas geográficas por entrega
- `motoristas` + `veiculos` - Informações do motorista/veículo
- `entregas` - Status das entregas associadas

### Integrações
- Google Maps API (já configurado no projeto)
- Realtime subscriptions do Supabase (hook `useRealtimeLocalizacoes` já existe)

---

## Fase 2: Dashboard de KPIs e Performance (Prioridade Alta)

### Objetivo
Criar uma página dedicada para análise de performance de motoristas e operação geral, utilizando a tabela `motorista_kpis`.

### Funcionalidades
- **Ranking de Motoristas**: Top performers por entregas, km rodado, taxa de atraso
- **Gráficos de Evolução**: Entregas por período, custos, tempo médio de entrega
- **Comparativos**: Performance entre períodos (mês atual vs anterior)
- **Métricas Agregadas**: Volume total, custo médio por km, taxa de sucesso
- **Filtros**: Por motorista, empresa, período

### Componentes a Criar
```
src/pages/admin/PerformanceKPIs.tsx
src/components/admin/kpis/DriverRankingTable.tsx
src/components/admin/kpis/PerformanceCharts.tsx
src/components/admin/kpis/KPICards.tsx
src/components/admin/kpis/PeriodComparison.tsx
```

### Dados Utilizados
- `motorista_kpis` - KPIs calculados por período
- `entregas` - Dados brutos para cálculos adicionais
- `motoristas` - Informações do motorista

### Visualizações (Recharts)
- Gráfico de barras: Ranking de motoristas
- Gráfico de linha: Evolução temporal
- Gráfico de pizza: Distribuição de status
- Cards com sparklines: Tendências

---

## Fase 3: Central de Validação de Documentos (Prioridade Média)

### Objetivo
Implementar um workflow completo para aprovação/rejeição de documentos de motoristas, veículos e carrocerias, com alertas de vencimento.

### Funcionalidades
- **Fila de Pendentes**: Documentos aguardando validação
- **Preview de Documentos**: Visualização inline (PDF/imagem)
- **Workflow de Aprovação**: Aprovar/Rejeitar com motivo
- **Alertas de Vencimento**: Documentos próximos do vencimento (CNH, ANTT, CRLV)
- **Histórico**: Log de validações realizadas
- **Notificações**: Alertar empresas/motoristas sobre documentos vencidos

### Componentes a Criar
```
src/pages/admin/DocumentosValidacao.tsx
src/components/admin/documentos/DocumentQueue.tsx
src/components/admin/documentos/DocumentPreview.tsx
src/components/admin/documentos/ValidationDialog.tsx
src/components/admin/documentos/ExpiringDocumentsAlert.tsx
```

### Dados Utilizados
- `documentos_validacao` - Documentos e status
- `motoristas` - CNH e dados do motorista
- `veiculos` - Documentos do veículo
- `carrocerias` - Documentos da carroceria

### Status de Documentos
- `pendente` → `aprovado` | `rejeitado`
- Campos: tipo, número, URL, data_emissao, data_vencimento

---

## Fase 4: Relatórios Avançados com Exportação (Prioridade Média)

### Objetivo
Substituir os placeholders da página de Relatórios por relatórios funcionais com filtros avançados e exportação para PDF/Excel.

### Funcionalidades
- **Relatório Operacional**: Volume de cargas, entregas por status, SLAs
- **Relatório de Crescimento**: Novos cadastros por período
- **Relatório Financeiro**: Volume de frete, média por entrega
- **Relatório de Frota**: Utilização de veículos, km rodado
- **Exportação**: PDF (jspdf) e Excel (xlsx)
- **Filtros**: Data, empresa, região

### Componentes a Criar
```
src/pages/admin/Relatorios.tsx (reescrever)
src/components/admin/relatorios/OperationalReport.tsx
src/components/admin/relatorios/GrowthReport.tsx
src/components/admin/relatorios/FinancialReport.tsx
src/components/admin/relatorios/FleetReport.tsx
src/components/admin/relatorios/ExportButtons.tsx
src/lib/reportExport.ts
```

### Dependências Novas
```json
{
  "jspdf": "^2.5.1",
  "jspdf-autotable": "^3.8.0",
  "xlsx": "^0.18.5"
}
```

### Dados Utilizados
- `cargas`, `entregas` - Dados operacionais
- `empresas`, `motoristas` - Dados de crescimento
- `veiculos`, `localizações` - Dados de frota

---

## Fase 5: CRUDs Complementares (Prioridade Média)

### Objetivo
Adicionar gerenciamento para entidades que ainda não possuem interface administrativa.

### 5.1 - Gestão de Carrocerias
```
src/pages/admin/CarroceriasAdmin.tsx
```
- Tabela com placa, tipo, marca, capacidade
- Filtros por empresa, status
- Dialog de detalhes com fotos
- Ações: ativar/desativar, excluir

### 5.2 - Gestão de Ajudantes
```
src/pages/admin/AjudantesAdmin.tsx
```
- Tabela com nome, CPF, telefone, motorista vinculado
- Filtros por status, tipo de cadastro
- Ações: ativar/desativar, excluir

### 5.3 - Gestão de Provas de Entrega
```
src/pages/admin/ProvasEntregaAdmin.tsx
```
- Visualização de comprovantes de entrega
- Fotos, assinaturas, checklist
- Filtros por entrega, motorista, período
- Modal de detalhes com galeria de imagens

### Padrão de Implementação
Todos seguirão o padrão já estabelecido em `VeiculosAdmin.tsx` e `MotoristasAdmin.tsx`:
- Stats cards no topo
- Barra de busca e filtros
- Tabela paginada
- Dialog de detalhes
- DropdownMenu de ações

---

## Fase 6: Atualizações na Sidebar e Navegação

### Objetivo
Adicionar as novas páginas ao menu administrativo.

### Alterações em `AdminSidebar.tsx`
```typescript
// Novos itens de menu
{
  title: 'Performance',
  icon: Award,
  href: '/admin/performance',
  roles: ['super_admin', 'admin'],
},
{
  title: 'Documentos',
  icon: FileCheck,
  href: '/admin/documentos',
  roles: ['super_admin', 'admin', 'suporte'],
},
{
  title: 'Frota',
  icon: Truck,
  roles: ['super_admin', 'admin'],
  subItems: [
    { title: 'Veículos', href: '/admin/veiculos', icon: Truck },
    { title: 'Carrocerias', href: '/admin/carrocerias', icon: Container },
  ],
},
{
  title: 'Cadastros',
  icon: Users,
  roles: ['super_admin', 'admin'],
  subItems: [
    { title: 'Motoristas', href: '/admin/motoristas', icon: User },
    { title: 'Ajudantes', href: '/admin/ajudantes', icon: UserPlus },
  ],
},
{
  title: 'Comprovantes',
  icon: Camera,
  href: '/admin/provas-entrega',
  roles: ['super_admin', 'admin', 'suporte'],
},
```

### Rotas em `App.tsx`
```typescript
<Route path="performance" element={<PerformanceKPIs />} />
<Route path="documentos" element={<DocumentosValidacao />} />
<Route path="carrocerias" element={<CarroceriasAdmin />} />
<Route path="ajudantes" element={<AjudantesAdmin />} />
<Route path="provas-entrega" element={<ProvasEntregaAdmin />} />
```

---

## Cronograma de Implementação Sugerido

| Fase | Módulo | Prioridade | Complexidade |
|------|--------|------------|--------------|
| 1 | Monitoramento em Tempo Real | Alta | Alta |
| 2 | Dashboard de KPIs | Alta | Média |
| 3 | Validação de Documentos | Média | Média |
| 4 | Relatórios com Exportação | Média | Média |
| 5 | CRUDs (Carrocerias, Ajudantes, Provas) | Média | Baixa |
| 6 | Navegação e Sidebar | Baixa | Baixa |

---

## Detalhes Técnicos

### Estrutura de Arquivos Final
```
src/pages/admin/
├── Monitoramento.tsx (reescrito)
├── PerformanceKPIs.tsx (novo)
├── DocumentosValidacao.tsx (novo)
├── Relatorios.tsx (reescrito)
├── CarroceriasAdmin.tsx (novo)
├── AjudantesAdmin.tsx (novo)
├── ProvasEntregaAdmin.tsx (novo)
└── ... (existentes)

src/components/admin/
├── monitoring/
│   ├── MonitoringMap.tsx
│   ├── DriverListPanel.tsx
│   ├── GeofenceOverlay.tsx
│   └── RoutePlayback.tsx
├── kpis/
│   ├── DriverRankingTable.tsx
│   ├── PerformanceCharts.tsx
│   ├── KPICards.tsx
│   └── PeriodComparison.tsx
├── documentos/
│   ├── DocumentQueue.tsx
│   ├── DocumentPreview.tsx
│   ├── ValidationDialog.tsx
│   └── ExpiringDocumentsAlert.tsx
├── relatorios/
│   ├── OperationalReport.tsx
│   ├── GrowthReport.tsx
│   ├── FinancialReport.tsx
│   ├── FleetReport.tsx
│   └── ExportButtons.tsx
└── ... (existentes)

src/lib/
├── reportExport.ts (novo - funções de exportação PDF/Excel)
```

### Padrões a Seguir
- Componentes seguem padrão shadcn/ui existente
- Gráficos usando Recharts (já instalado)
- Mapas usando Google Maps API (já configurado)
- Estilização com Tailwind e variáveis de tema
- Paginação com componente `Pagination` existente
- Dialogs de confirmação com `DeleteConfirmDialog` existente

### Controle de Acesso por Role
- `super_admin`: Acesso total
- `admin`: Acesso a todos os módulos operacionais
- `suporte`: Acesso de leitura a monitoramento, documentos e comprovantes

---

## Resumo das Entregas

1. **Monitoramento Real-Time** - Mapa com motoristas, geofences e histórico de rota
2. **Performance KPIs** - Rankings, métricas e comparativos de motoristas
3. **Central de Documentos** - Workflow de aprovação e alertas de vencimento
4. **Relatórios Avançados** - Operacional, crescimento, financeiro com exportação PDF/Excel
5. **CRUD Carrocerias** - Gestão de reboques/semirreboques
6. **CRUD Ajudantes** - Gestão de ajudantes de motoristas
7. **CRUD Provas de Entrega** - Visualização de comprovantes
8. **Navegação Atualizada** - Sidebar reorganizada com novos módulos

