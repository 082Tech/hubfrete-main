
# Plano de Implementação - CRUDs Administrativos Complementares

## Resumo

Este plano detalha a implementação dos 3 CRUDs complementares da Fase 5 do plano original, além das atualizações necessárias na navegação da Torre de Controle:

1. **CRUD Carrocerias** - Gestão de reboques/semirreboques
2. **CRUD Ajudantes** - Gestão de ajudantes de motoristas  
3. **CRUD Provas de Entrega** - Visualização de comprovantes de entrega

---

## Fase 1: CRUD de Carrocerias

### Página: `src/pages/admin/CarroceriasAdmin.tsx`

**Funcionalidades:**
- Tabela paginada com todas as carrocerias cadastradas
- Stats cards: Total, Ativas, Com motorista, Por empresa
- Busca por placa, marca ou modelo
- Filtros por status (ativo/inativo) e tipo de carroceria
- Dialog de detalhes com galeria de fotos
- Ações: Ver detalhes, Ativar/Desativar, Excluir

**Dados da Tabela `carrocerias`:**
```
- id, placa, tipo, marca, modelo, ano
- renavam, capacidade_kg, capacidade_m3
- ativo, empresa_id, motorista_id
- foto_url, fotos_urls[]
```

**Colunas da Tabela:**
| Placa | Tipo | Marca/Modelo | Capacidade | Motorista | Empresa | Status | Ações |

---

## Fase 2: CRUD de Ajudantes

### Página: `src/pages/admin/AjudantesAdmin.tsx`

**Funcionalidades:**
- Tabela paginada com todos os ajudantes cadastrados
- Stats cards: Total, Ativos, Por tipo de cadastro
- Busca por nome, CPF ou telefone
- Filtros por status (ativo/inativo) e tipo de cadastro
- Dialog de detalhes
- Ações: Ver detalhes, Ativar/Desativar, Excluir

**Dados da Tabela `ajudantes`:**
```
- id, nome, cpf, telefone
- ativo, tipo_cadastro
- motorista_id (vinculado ao motorista)
- comprovante_vinculo_url
```

**Colunas da Tabela:**
| Nome | CPF | Telefone | Motorista Vinculado | Tipo | Status | Ações |

---

## Fase 3: CRUD de Provas de Entrega

### Página: `src/pages/admin/ProvasEntregaAdmin.tsx`

**Funcionalidades:**
- Galeria/tabela de comprovantes de entrega
- Stats cards: Total de provas, Por período
- Busca por código de entrega ou nome do recebedor
- Filtros por período (data)
- Dialog de detalhes com:
  - Galeria de fotos (`fotos_urls[]`)
  - Assinatura do recebedor (`assinatura_url`)
  - Checklist de conferência (`checklist`)
  - Dados do recebedor
- Preview de imagens em lightbox

**Dados da Tabela `provas_entrega`:**
```
- id, entrega_id
- nome_recebedor, documento_recebedor
- assinatura_url, fotos_urls[]
- checklist (JSON), observacoes
- timestamp
```

**Colunas da Tabela:**
| Entrega | Recebedor | Documento | Fotos | Assinatura | Data | Ações |

---

## Fase 4: Atualização da Navegação

### Alterações em `AdminSidebar.tsx`

Adicionar os novos itens de menu organizados em submenus:

```typescript
// Submenu Frota
{
  title: 'Frota',
  icon: Truck,
  roles: ['super_admin', 'admin', 'suporte'],
  subItems: [
    { title: 'Veículos', href: '/admin/veiculos', icon: Truck },
    { title: 'Carrocerias', href: '/admin/carrocerias', icon: Container },
  ],
},

// Submenu Cadastros
{
  title: 'Cadastros',
  icon: Users,
  roles: ['super_admin', 'admin', 'suporte'],
  subItems: [
    { title: 'Motoristas', href: '/admin/motoristas', icon: User },
    { title: 'Ajudantes', href: '/admin/ajudantes', icon: UserPlus },
  ],
},

// Item Comprovantes
{
  title: 'Comprovantes',
  icon: Camera,
  href: '/admin/provas-entrega',
  roles: ['super_admin', 'admin', 'suporte'],
},
```

### Alterações em `App.tsx`

Adicionar as novas rotas no bloco admin:

```typescript
<Route path="carrocerias" element={<CarroceriasAdmin />} />
<Route path="ajudantes" element={<AjudantesAdmin />} />
<Route path="provas-entrega" element={<ProvasEntregaAdmin />} />
```

---

## Detalhes Técnicos

### Estrutura de Arquivos

```
src/pages/admin/
├── CarroceriasAdmin.tsx (novo)
├── AjudantesAdmin.tsx (novo)
├── ProvasEntregaAdmin.tsx (novo)
└── ... (existentes)
```

### Padrão de Implementação

Todos os CRUDs seguirão o padrão já estabelecido em `VeiculosAdmin.tsx` e `MotoristasAdmin.tsx`:

1. **Stats Cards** no topo com métricas relevantes
2. **Barra de busca e filtros** (Select para status e tipo)
3. **Tabela paginada** usando componente `Pagination` existente
4. **Dialog de detalhes** para visualização completa
5. **DropdownMenu de ações** (Ver, Ativar/Desativar, Excluir)
6. **DeleteConfirmDialog** para confirmação de exclusão

### Componentes Reutilizados

- `Card`, `CardContent` - Layout de cards
- `Table`, `TableHeader`, `TableBody`, etc. - Tabelas
- `Badge` - Status e tipos
- `Dialog` - Modais de detalhes
- `DropdownMenu` - Menu de ações
- `Pagination` - Paginação existente
- `DeleteConfirmDialog` - Confirmação de exclusão

### Queries Supabase

**Carrocerias:**
```typescript
supabase.from('carrocerias')
  .select(`*, empresa:empresas(id, nome), motorista:motoristas(id, nome_completo)`)
  .order('created_at', { ascending: false })
```

**Ajudantes:**
```typescript
supabase.from('ajudantes')
  .select(`*, motorista:motoristas(id, nome_completo)`)
  .order('created_at', { ascending: false })
```

**Provas de Entrega:**
```typescript
supabase.from('provas_entrega')
  .select(`*, entrega:entregas(id, codigo, motorista:motoristas(id, nome_completo))`)
  .order('timestamp', { ascending: false })
```

---

## Resumo das Entregas

| Arquivo | Descrição | Prioridade |
|---------|-----------|------------|
| `CarroceriasAdmin.tsx` | CRUD completo de carrocerias/implementos | Alta |
| `AjudantesAdmin.tsx` | CRUD completo de ajudantes de motoristas | Alta |
| `ProvasEntregaAdmin.tsx` | Visualização de provas de entrega com galeria | Alta |
| `AdminSidebar.tsx` | Novos itens de menu e submenus | Alta |
| `App.tsx` | Novas rotas administrativas | Alta |

---

## Considerações Adicionais

- **Galeria de Fotos**: O CRUD de Provas de Entrega terá um lightbox para visualização de fotos em tela cheia
- **Checklist**: Será renderizado como uma lista de checkboxes visuais (somente leitura)
- **Assinatura**: Será exibida como imagem quando disponível
- **Submenus**: A sidebar será reorganizada para agrupar funcionalidades relacionadas (Frota, Cadastros)
