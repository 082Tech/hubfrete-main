# 🚛 HubFrete — Documentação Completa do Sistema

> **Plataforma B2B de gestão de fretes** que conecta Embarcadores, Transportadoras e Motoristas em um ecossistema logístico completo com rastreamento em tempo real, emissão fiscal automatizada e inteligência artificial integrada.

**Última atualização:** 2026-02-26  
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Supabase + Leaflet/Google Maps  
**URL de Produção:** https://hub-frete.lovable.app

---

## 📋 Índice

1. [Visão Geral e Objetivo](#1-visão-geral-e-objetivo)
2. [Arquitetura Técnica](#2-arquitetura-técnica)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Tipos de Usuários e Permissões](#4-tipos-de-usuários-e-permissões)
5. [Landing Page e Onboarding](#5-landing-page-e-onboarding)
6. [Portal do Embarcador](#6-portal-do-embarcador)
7. [Portal da Transportadora](#7-portal-da-transportadora)
8. [Portal do Motorista (App Flutter)](#8-portal-do-motorista)
9. [Torre de Controle (Admin)](#9-torre-de-controle-admin)
10. [Sistema de Cargas e Entregas](#10-sistema-de-cargas-e-entregas)
11. [Sistema de Viagens (Trip-Centric Model)](#11-sistema-de-viagens)
12. [Rastreamento e Telemetria](#12-rastreamento-e-telemetria)
13. [Documentação Fiscal (CT-e, MDF-e, NF-e, GNRE)](#13-documentação-fiscal)
14. [Sistema de Mensagens (Chat)](#14-sistema-de-mensagens-chat)
15. [Sistema de Notificações](#15-sistema-de-notificações)
16. [Assistente IA (Hubinho)](#16-assistente-ia-hubinho)
17. [Mapas e Geolocalização](#17-mapas-e-geolocalização)
18. [Edge Functions (Backend)](#18-edge-functions)
19. [Triggers e Automações do Banco](#19-triggers-e-automações)
20. [Segurança e RLS](#20-segurança-e-rls)
21. [Fluxos Operacionais Completos](#21-fluxos-operacionais-completos)
22. [Hooks Customizados](#22-hooks-customizados)
23. [Bibliotecas Utilitárias (src/lib)](#23-bibliotecas-utilitárias)
24. [Design System e UI](#24-design-system-e-ui)
25. [PWA e Service Worker](#25-pwa-e-service-worker)
26. [Schema do Banco de Dados](#26-schema-do-banco-de-dados)
27. [Enums e Constantes](#27-enums-e-constantes)
28. [Storage (Buckets)](#28-storage-buckets)
29. [Contexto Acumulado e Decisões de Arquitetura](#29-contexto-acumulado)

---

## 1. Visão Geral e Objetivo

O **HubFrete** é uma plataforma SaaS de logística B2B que digitaliza todo o ciclo de vida do frete rodoviário brasileiro:

- **Embarcadores** publicam cargas com especificações detalhadas (peso, tipo, requisitos de veículo, remetente/destinatário)
- **Transportadoras** aceitam cargas, alocam motoristas/veículos/carrocerias e gerenciam a operação diária
- **Motoristas** executam entregas, enviam localização em tempo real e coletam provas de entrega (POD Digital)
- **Administradores (Torre de Controle)** monitoram toda a plataforma, gerenciam chamados, validam documentos e acompanham KPIs

### Modelo de Negócio B2B

O foco é **Business-to-Business**, utilizando os termos **Remetente** e **Destinatário** (não "Origem/Destino") em todos os cabeçalhos de tabela e formulários. As interfaces priorizam identidade corporativa: Razão Social, CNPJ, Nome Fantasia. Endereços completos ficam em tooltips ou detalhes expandidos.

---

## 2. Arquitetura Técnica

```
┌────────────────────────────────────────────────────────────────────┐
│                         HUBFRETE PLATFORM                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌──────────────┐  ┌────────────────┐  ┌───────────────┐         │
│   │  EMBARCADOR  │  │ TRANSPORTADORA │  │   MOTORISTA   │         │
│   │  (React SPA) │  │  (React SPA)   │  │ (Flutter App) │         │
│   └──────┬───────┘  └───────┬────────┘  └──────┬────────┘         │
│          └──────────────────┼──────────────────┘                   │
│                             │                                      │
│                 ┌───────────▼───────────┐                          │
│                 │       SUPABASE        │                          │
│                 │  ┌─────────────────┐  │                          │
│                 │  │    Auth (JWT)   │  │                          │
│                 │  ├─────────────────┤  │                          │
│                 │  │  PostgreSQL DB  │  │                          │
│                 │  ├─────────────────┤  │                          │
│                 │  │ Edge Functions  │  │                          │
│                 │  ├─────────────────┤  │                          │
│                 │  │    Storage      │  │                          │
│                 │  ├─────────────────┤  │                          │
│                 │  │   Realtime WS   │  │                          │
│                 │  └─────────────────┘  │                          │
│                 └───────────────────────┘                          │
│                             │                                      │
│                 ┌───────────▼───────────┐                          │
│                 │  TORRE DE CONTROLE    │                          │
│                 │    (Admin Panel)      │                          │
│                 └───────────────────────┘                          │
│                                                                    │
│   Integrações Externas:                                            │
│   • Focus NFe (CT-e, MDF-e)                                       │
│   • OSRM (Rotas)                                                   │
│   • Google Maps API                                                │
│   • N8n Webhooks (IA)                                              │
│   • Web Push API (Notificações)                                    │
│   • ViaCEP / BrasilAPI (CNPJ/CEP)                                 │
│   • IBGE (Códigos de Município)                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Stack Frontend
| Tecnologia | Uso |
|---|---|
| **React 18** | Framework UI |
| **TypeScript** | Tipagem estática |
| **Vite** | Build tool |
| **Tailwind CSS** | Estilização utility-first |
| **shadcn/ui** | Componentes base (Radix UI) |
| **React Router v6** | Roteamento SPA |
| **TanStack React Query** | Cache e fetching de dados |
| **Framer Motion** | Animações |
| **Recharts** | Gráficos |
| **Leaflet + Google Maps** | Mapas |
| **react-globe.gl** | Globo 3D na landing |
| **jsPDF + xlsx** | Exportação de relatórios |

### Stack Backend (Supabase)
| Serviço | Uso |
|---|---|
| **Auth** | Autenticação JWT, roles, convites |
| **PostgreSQL** | Banco relacional com RLS |
| **Edge Functions (Deno)** | Lógica server-side |
| **Storage** | Arquivos (NF-e, fotos, CT-e) |
| **Realtime** | WebSocket para chat e localização |

---

## 3. Estrutura de Pastas

```
src/
├── App.tsx                    # Roteamento principal
├── main.tsx                   # Entry point
├── index.css                  # Design tokens (CSS variables)
├── assets/                    # Imagens importadas via ES6
│
├── components/
│   ├── ui/                    # shadcn/ui components (40+ componentes)
│   ├── landing/               # Landing page (Hero, Features, CTA, Globe, etc.)
│   ├── admin/                 # Torre de Controle
│   │   ├── charts/            # Gráficos do dashboard admin
│   │   ├── documentos/        # Validação de documentos
│   │   ├── kpis/              # KPIs de performance
│   │   ├── monitoring/        # Monitoramento real-time (mapa, geofences)
│   │   └── relatorios/        # Relatórios admin
│   ├── ai-assistant/          # Assistente Hubinho
│   ├── cargas/                # Formulários e dialogs de cargas
│   ├── entregas/              # Detalhes e documentos de entregas
│   ├── fiscal/                # Configuração fiscal
│   ├── frota/                 # Veículos e carrocerias
│   ├── historico/             # Histórico de viagens
│   ├── maps/                  # Componentes de mapas (Leaflet + Google)
│   ├── mensagens/             # Sistema de chat
│   ├── motoristas/            # Gestão de motoristas (wizard multi-step)
│   ├── notificacoes/          # Dropdown e toast de notificações
│   ├── portals/               # Layout compartilhado dos portais
│   ├── relatorios/            # Relatórios dos portais
│   ├── settings/              # Configurações de conta
│   ├── users/                 # Gestão de usuários da empresa
│   ├── viagens/               # Painel de viagens (detalhes, mapa, timeline)
│   └── contatos/              # Gestão de contatos salvos
│
├── pages/
│   ├── Landing.tsx            # Página pública principal
│   ├── Login.tsx              # Login unificado
│   ├── Dashboard.tsx          # Router pós-login (redireciona por role)
│   ├── ForgotPassword.tsx     # Recuperação de senha
│   ├── ResetPassword.tsx      # Redefinição de senha
│   ├── Cadastro*.tsx          # Cadastros completos (Embarcador, Transportadora, Motorista)
│   ├── PreCadastro*.tsx       # Pré-cadastros públicos
│   ├── admin/                 # 17 páginas do painel admin
│   ├── portals/
│   │   ├── embarcador/        # 12 páginas do portal embarcador
│   │   └── transportadora/    # 13 páginas do portal transportadora
│   └── public/
│       └── Rastreio.tsx       # Rastreamento público por código
│
├── hooks/                     # 17 hooks customizados
├── lib/                       # 12 bibliotecas utilitárias
├── contexts/                  # Contexts (Chat, Notificações)
├── integrations/supabase/     # Client e types gerados
└── utils/                     # Utilitários simples

supabase/
├── config.toml                # Configuração do projeto
└── functions/                 # 13 Edge Functions
    ├── accept-invite/
    ├── create-admin-user/
    ├── create-chat-for-entrega/
    ├── create-driver-auth/
    ├── delete-driver-auth/
    ├── finalizar-entrega/
    ├── focusnfe-cte/
    ├── focusnfe-mdfe/
    ├── invite-user/
    ├── migrate-fleet-photos/
    ├── push-notifications/
    ├── reset-driver-password/
    └── validate-nfe/
```

---

## 4. Tipos de Usuários e Permissões

### Hierarquia de Entidades

```
auth.users (Supabase Auth — JWT)
    │
    ├── usuarios (perfil no sistema)
    │       ├── empresa_id → empresas
    │       ├── cargo: ADMIN | OPERADOR
    │       └── usuarios_filiais (vínculo N:N com filiais)
    │
    ├── user_roles (papel global: embarcador | transportadora | motorista)
    │
    ├── motoristas (dados específicos: CPF, CNH, foto, veículo)
    │       └── user_id → auth.users.id
    │
    └── torre_users (admin: super_admin | admin | suporte)
```

### Tabela `empresas`
- **tipo**: `EMBARCADOR` | `TRANSPORTADORA`
- **classe**: `matriz` | `filial`
- Centraliza todas as empresas. Cargas, entregas, motoristas vinculam-se via `empresa_id`.

### Funções SQL de Permissão
| Função | Retorno | Uso |
|--------|---------|-----|
| `user_belongs_to_empresa(uid, empresa_id)` | boolean | RLS: dados da própria empresa |
| `get_user_empresa_id(uid)` | bigint | Obter empresa do usuário |
| `get_user_empresa_tipo(uid)` | text | Obter tipo (EMBARCADOR/TRANSPORTADORA) |
| `has_role(uid, role)` | boolean | Verificar role global |
| `is_admin(uid)` | boolean | É admin da torre? |
| `has_admin_role(uid, role)` | boolean | Qual nível admin? |
| `get_user_motorista_id(uid)` | uuid | Obter motorista_id a partir do auth |
| `is_chat_participant(chat_id, uid)` | boolean | Participante do chat? |

---

## 5. Landing Page e Onboarding

### Rota: `/`

Componentes em `src/components/landing/`:

| Componente | Descrição |
|---|---|
| `ModernNavbar` | Navbar com links âncora e CTA "Acessar Plataforma" |
| `ModernHero` | Hero section com headline, subtitle e CTA principal |
| `MacBookSlideshow` | Mockup de MacBook com slideshow de screenshots do sistema |
| `ModernFeatures` | Grid de features com ícones e descrições |
| `ModernBenefits` | Benefícios para cada tipo de usuário |
| `ModernHowItWorks` | Passo-a-passo de como funciona |
| `ModernGlobeSection` | Globo 3D interativo (react-globe.gl) com arcos animados |
| `ModernCTA` | Call-to-action final para cadastro |
| `ModernFooter` | Rodapé com links e informações |

### Cadastro e Pré-cadastro

| Rota | Descrição |
|---|---|
| `/pre-cadastro/embarcador` | Formulário público simplificado |
| `/pre-cadastro/transportadora` | Formulário público simplificado |
| `/pre-cadastro/motorista` | Formulário público simplificado |
| `/cadastro/embarcador` | Cadastro completo com criação de empresa |
| `/cadastro/transportadora` | Cadastro completo com criação de empresa |
| `/cadastro/motorista` | Cadastro de motorista autônomo |
| `/cadastro/motorista/convite` | Cadastro de motorista via link de convite |
| `/cadastro/motorista/convite/:linkId` | Cadastro de motorista via link específico |

---

## 6. Portal do Embarcador

### Rota base: `/embarcador`
**Layout**: `PortalLayoutWrapper` + `PortalSidebar` + `BottomNavigation` (mobile)

| Rota | Componente | Funcionalidade |
|---|---|---|
| `/embarcador` | `EmbarcadorDashboard` | Dashboard com KPIs: cargas publicadas, entregas em rota, frete total |
| `/embarcador/cargas` | `CargasPublicadas` | **Gestão de cargas**: tabela com header duplo (carga ↔ entregas aninhadas), filtros, busca avançada. Inclui dialog `NovaCargaDialog` (wizard multi-step) |
| `/embarcador/cargas/em-rota` | `GestaoCargas` | Cargas em trânsito com mapa e acompanhamento |
| `/embarcador/cargas/historico` | `HistoricoCargas` | Histórico com filtros avançados e modal de detalhes (remetente/destinatário mapeados corretamente) |
| `/embarcador/relatorios` | `Relatorios` | Relatórios operacionais, financeiros e de performance com export PDF/Excel |
| `/embarcador/assistente` | `Assistente` | Hubinho IA (página dedicada) |
| `/embarcador/mensagens` | `Mensagens` | Chat por entrega com anexos |
| `/embarcador/contatos` | `ContatosSalvos` | CRUD de contatos de destinatário (CNPJ, endereço, contato) |
| `/embarcador/notificacoes` | `Notificacoes` | Central de notificações |
| `/embarcador/filiais` | `GerenciarFiliais` | CRUD de filiais da empresa |
| `/embarcador/usuarios` | `UsuariosEmpresa` | Gestão de usuários + convites |
| `/embarcador/configuracoes` | `Configuracoes` | Perfil da empresa, configuração fiscal |

### Criação de Carga (NovaCargaDialog)

O wizard de criação é composto por seções:
1. **OrigemSection** — Endereço de coleta (CEP autocomplete, horários de funcionamento, opera sab/dom)
2. **RemetenteSection** — Dados do remetente (CNPJ lookup via BrasilAPI, razão social, IE)
3. **DestinoSection** — Endereço de entrega + dados do destinatário
4. **ResumoSection** — Tipo de carga, peso, volume, quantidade, paletes, valor da mercadoria
5. **NecessidadesEspeciais** — Refrigeração, carga perigosa/frágil/viva, empilhamento
6. **VeiculoCarroceriaSelect** — Requisitos de veículo/carroceria
7. **NotaFiscalUpload** — Upload de XML da NF-e com validação automática

---

## 7. Portal da Transportadora

### Rota base: `/transportadora`

| Rota | Componente | Funcionalidade |
|---|---|---|
| `/transportadora` | `TransportadoraDashboard` | Dashboard com KPIs operacionais |
| `/transportadora/cargas` | `CargasDisponiveis` | **Marketplace**: lista de cargas publicadas disponíveis para aceitar. Inclui detalhes, mapa de rota e aceitação com seleção de motorista/veículo/carroceria |
| `/transportadora/entregas` | `OperacaoDiaria` | **Operação diária** — Tela principal com dois modos de visualização: "Por Entregas" e "Por Viagens" (padrão). Cada modo divide em colunas: Ativas e Finalizadas |
| `/transportadora/entregas/historico` | `HistoricoEntregas` | Histórico completo com filtros |
| `/transportadora/frota` | `MinhaFrota` | CRUD de veículos e carrocerias (com fotos, RENAVAM, capacidade) |
| `/transportadora/motoristas` | `Motoristas` | Gestão de motoristas com wizard multi-step, links de convite, e redefinição de senha |
| `/transportadora/relatorios` | `Relatorios` | Relatórios com tabs: Operacional, Financeiro, Performance |
| `/transportadora/assistente` | `Assistente` | Hubinho IA |
| `/transportadora/mensagens` | `Mensagens` | Chat por entrega |
| `/transportadora/notificacoes` | `Notificacoes` | Central de notificações |
| `/transportadora/filiais` | `GerenciarFiliais` | CRUD de filiais |
| `/transportadora/usuarios` | `UsuariosEmpresa` | Gestão de usuários + convites |
| `/transportadora/configuracoes` | `Configuracoes` | Perfil, configuração fiscal, certificado digital |

### Operação Diária (OperacaoDiaria)

A tela mais complexa do portal, organizada em torno do conceito de **Viagens**:

- **Modo Viagens (padrão)**: Lista de viagens (VGM-YYYY-NNNN) com status, motorista, veículo. Ao selecionar uma viagem, abre o `ViagemDetailPanel`:
  - Grid de cards de entregas com badges de alerta para docs pendentes (NF-e, CT-e)
  - Mapa multi-ponto consolidado com origens (O) e destinos (D) + histórico de rastreamento
  - Timeline unificada de eventos da viagem e entregas
  - Status de conectividade do motorista (baseado em `updated_at` de `locations`)
  - Ações: Finalizar viagem (com validações), cancelar, anexar MDF-e

- **Modo Entregas**: Lista plana de entregas com acesso direto aos detalhes

### Validações de Finalização de Viagem

Uma viagem só pode ser encerrada se:
1. Todas as entregas têm status terminal (`entregue` ou `cancelada`)
2. Cada entrega `entregue` tem: canhoto_url + pelo menos 1 NF-e + pelo menos 1 CT-e
3. A viagem tem pelo menos 1 MDF-e autorizado

Validação aplicada no frontend E via trigger `proteger_finalizacao_viagem` no banco.

---

## 8. Portal do Motorista

> O portal do motorista no **web** foi removido. A experiência do motorista é via **aplicativo Flutter** nativo.

O app Flutter envia dados para o Supabase no formato:
- Tabela: `locations`
- Colunas: `motorista_id`, `latitude`, `longitude`, `altitude`, `accuracy`, `speed`, `heading`
- Suporte offline-first via campo `tracked_at` na tabela `tracking_historico`
- Idempotência via `request_id`

---

## 9. Torre de Controle (Admin)

### Rota base: `/admin`
**Layout**: `AdminLayoutWrapper` + `AdminSidebar`
**Acesso**: `torre_users` com roles `super_admin`, `admin`, `suporte`

| Rota | Componente | Funcionalidade |
|---|---|---|
| `/admin/torre-controle` | `TorreControle` | Dashboard principal com gráficos de acesso, crescimento, status de entregas |
| `/admin/monitoramento` | `Monitoramento` | **Mapa em tempo real** (Google Maps) com geofences, replay de rotas, painel de motoristas |
| `/admin/performance` | `PerformanceKPIs` | KPIs de motoristas: ranking, comparação de períodos, gráficos de performance |
| `/admin/documentos` | `DocumentosValidacao` | Fila de validação de documentos com preview, alertas de vencimento |
| `/admin/relatorios` | `Relatorios` | Relatórios operacionais, financeiros e de crescimento com export PDF/Excel |
| `/admin/chamados` | `Chamados` | Central de suporte: criação, atribuição, resolução de tickets |
| `/admin/empresas` | `Empresas` | CRUD de empresas (Embarcadores e Transportadoras) |
| `/admin/usuarios` | `Usuarios` | Gestão de todos os usuários do sistema |
| `/admin/motoristas` | `MotoristasAdmin` | CRUD global de motoristas |
| `/admin/veiculos` | `VeiculosAdmin` | CRUD global de veículos |
| `/admin/cargas` | `CargasAdmin` | Visão global de todas as cargas |
| `/admin/cargas/historico` | `CargasHistoricoAdmin` | Histórico global de cargas |
| `/admin/entregas` | `EntregasAdmin` | Visão global de todas as entregas |
| `/admin/carrocerias` | `CarroceriasAdmin` | CRUD de carrocerias |
| `/admin/ajudantes` | `AjudantesAdmin` | CRUD de ajudantes de motorista |
| `/admin/provas-entrega` | `ProvasEntregaAdmin` | Galeria de provas de entrega com checklists |
| `/admin/storage` | `StorageExplorer` | Explorador de buckets do Supabase Storage |
| `/admin/logs` | `Logs` | Auditoria: logs de operações do sistema |
| `/admin/pre-cadastros` | `PreCadastros` | Gestão de pré-cadastros pendentes |

### Submenus do Admin
A sidebar organiza em submenus:
- **Visão Geral**: Torre de Controle
- **Operações**: Monitoramento, Entregas, Cargas
- **Frota**: Veículos, Carrocerias, Motoristas, Ajudantes
- **Cadastros**: Empresas, Usuários, Pré-cadastros
- **Qualidade**: Documentos, Provas de Entrega, KPIs
- **Análise**: Relatórios, Chamados, Logs, Storage

---

## 10. Sistema de Cargas e Entregas

### Ciclo de Vida da Carga

```
RASCUNHO → PUBLICADA → PARCIALMENTE_ALOCADA → TOTALMENTE_ALOCADA → FINALIZADA
                ↓                                                        ↓
            CANCELADA ←──────────────────────────────────────────── CANCELADA
```

### Ciclo de Vida da Entrega

```
AGUARDANDO → SAIU_PARA_COLETA → SAIU_PARA_ENTREGA → ENTREGUE
                                                   → PROBLEMA
                                                   → CANCELADA
```

### Tabela `cargas`
- **codigo**: Gerado automaticamente (`CRG-YYYY-NNNN`)
- **empresa_id**: Embarcador que publicou
- **filial_id**: Filial de origem
- **peso_kg / peso_disponivel_kg**: Peso total e disponível para alocação fracionada
- **permite_fracionado**: Permite dividir entre múltiplos motoristas
- **endereco_origem_id / endereco_destino_id**: → `enderecos_carga`
- **contato_destino_id**: → `contatos_destino`
- **Dados do remetente**: `remetente_cnpj`, `remetente_razao_social`, `remetente_nome_fantasia`, `remetente_inscricao_estadual`
- **Dados do destinatário**: `destinatario_cnpj`, `destinatario_razao_social`, `destinatario_nome_fantasia`
- **Requisitos**: `veiculo_requisitos` (JSON), `necessidades_especiais` (array), `carga_perigosa`, `carga_fragil`, `carga_viva`, `requer_refrigeracao`
- **Precificação**: `tipo_precificacao` (por_tonelada, por_km, fixo, por_m3), `valor_frete_*`
- **Documentação**: `nota_fiscal_url`, `documentacao` (JSON)

### Tabela `entregas`
- **codigo**: Gerado automaticamente (`CRG-YYYY-NNNN-E01`)
- **tracking_code**: Código único para rastreamento público
- **carga_id**: → `cargas`
- **motorista_id / veiculo_id / carroceria_id**: Alocação de recursos
- **peso_alocado_kg**: Peso desta parcela (para fracionamento)
- **status**: Enum `status_entrega`
- **Comprovantes**: `canhoto_url`, `foto_comprovante_coleta`, `foto_comprovante_entrega`, `assinatura_recebedor`, `nome_recebedor`, `documento_recebedor`
- **Documentos fiscais**: `cte_url`, `numero_cte`, `notas_fiscais_urls[]`, `manifesto_url`

### Função `accept_carga_tx` (RPC Transacional)
1. Valida que veículo pertence ao motorista
2. Valida capacidade do veículo
3. Valida que carga está disponível
4. Valida peso disponível
5. Cria registro de entrega
6. Debita `peso_disponivel_kg` da carga
7. Atualiza status da carga se totalmente alocada

---

## 11. Sistema de Viagens

### Modelo Trip-Centric

O rastreamento é centrado em **viagens** (VGM-YYYY-NNNN), não em entregas individuais:

```
viagem (VGM-2026-0001)
├── motorista_id (obrigatório)
├── veiculo_id (obrigatório)
├── carroceria_id (obrigatório)
├── status: aguardando | programada | em_andamento | finalizada | cancelada
├── started_at / finished_at
├── km_inicial / km_final
│
├── viagem_entregas (tabela de junção N:N)
│   ├── entrega_1
│   ├── entrega_2
│   └── entrega_3
│
├── tracking_historico (múltiplos pontos GPS por viagem)
│
└── manifestos / mdfes (documentos de manifesto vinculados à viagem)
```

### Regras operacionais:
- Uma viagem pode conter **várias entregas** e **vários MDF-es** (apenas um ativo por vez)
- Não é permitido adicionar entregas a viagens encerradas
- Novas entregas são automaticamente associadas à viagem ativa do motorista ou criam uma nova viagem
- O trigger `proteger_finalizacao_viagem` impede encerramento sem documentos completos
- A remoção de entregas limpa registros órfãos em `viagem_entregas` e restaura peso na carga

### Funções SQL do ciclo de viagem:
- `get_viagem_ativa(motorista_id)` — Retorna viagem ativa
- `criar_viagem_para_entregas(...)` — Cria nova viagem vinculando entregas
- `finalizar_viagem(viagem_id)` — Calcula KM final e encerra

---

## 12. Rastreamento e Telemetria

### Arquitetura

```
Flutter App (GPS)
       │
       ▼
┌─────────────────┐
│    locations     │  ← Posição ATUAL (1 linha por motorista, UPSERT)
│  (motorista_id   │
│   UNIQUE)        │
└────────┬────────┘
         │ (Realtime subscription nos portais)
         ▼
┌─────────────────────┐
│ tracking_historico   │  ← Histórico completo de GPS
│  (vinculado a        │     (offline-first: tracked_at + request_id)
│   viagem_id)         │
└─────────────────────┘
```

### Tabela `locations` (posição atual)
- **motorista_id** (UNIQUE) — Uma linha por motorista
- `latitude`, `longitude`, `altitude`
- `speed`, `heading`, `accuracy`, `gps_quality`
- `viagem_id` — Viagem ativa
- `updated_at` — Usado para calcular conectividade ("última vez visto")

### Tabela `tracking_historico` (histórico)
- **viagem_id** → `viagens`
- `tracked_at` — Timestamp real da captura (suporte offline)
- `request_id` — Idempotência para reenvio offline
- `latitude`, `longitude`, `altitude`
- `velocidade`, `bussola_pos`, `precisao`
- `status` — Status da entrega no momento (nullable, inferido dinamicamente)

### Visualização no Mapa

- **Mapa de detalhes da entrega**: Pontos filtrados pelo período ativo, coloridos pelo status da entrega
- **Mapa de detalhes da viagem** (`ViagemTrackingMapDialog`): Pontos seguem o status geral da viagem:
  - 🟠 Âmbar: `aguardando` / `programada`
  - 🔵 Azul: `em_andamento`
  - 🟢 Verde: `finalizada` / `concluida`
  - 🔴 Vermelho: `cancelada`
- **Marcadores**: `O` (origem/verde) e `D` (destino/vermelho) para waypoints; `TruckIcon` para posição real com direção
- **Barra de estatísticas**: Duração, velocidade média/máxima, total de pontos capturados
- **Rotas OSRM**: Traçado realista em estradas (não linha reta)
- **Busca em lote**: 1000 registros/chamada para trajetos longos

### Hook: `useRealtimeLocalizacoes`
Subscrição Realtime na tabela `locations` para atualização em tempo real dos marcadores no mapa.

---

## 13. Documentação Fiscal

### Hierarquia Documental

```
Viagem
├── MDF-e (Manifesto de Documento Fiscal Eletrônico)
│   └── Vinculado a viagem_id (pode ter vários, apenas 1 ativo)
│
└── Entrega
    ├── NF-e (Nota Fiscal Eletrônica)
    │   └── Tabela: nfes (xml_content persistido para consulta rápida)
    ├── CT-e (Conhecimento de Transporte Eletrônico)
    │   └── Tabela: ctes (emissão automática via Focus NFe)
    └── Canhoto (POD - Proof of Delivery)
        └── Campo: entregas.canhoto_url
```

### Tabela `config_fiscal` (por empresa)
- `ambiente`: 1 (produção) ou 2 (homologação)
- `regime_tributario_emitente`: 1 (Simples Nacional), 2 (SN Excesso Sublimite), 3 (Regime Normal)
- `serie_cte` / `proximo_numero_cte`: Sequência com bloqueio `FOR UPDATE`
- `cfop_estadual` / `cfop_interestadual`: Determinado automaticamente por UF
- `icms_situacao_tributaria` / `icms_aliquota` / `icms_base_calculo_percentual`
- `natureza_operacao`, `tomador_padrao`, `tipo_servico`

### Tabela `nfes`
- `xml_content`: XML bruto persistido para extração automática
- `chave_acesso`, `numero`, `serie`, `valor`
- `remetente_*` / `destinatario_*`: Dados extraídos do XML

### Tabela `ctes`
- `focus_ref` / `focus_status`: Referência e status na API Focus NFe
- `chave_acesso`, `numero`, `serie`, `valor`
- `url` / `xml_url`: Links dos documentos gerados

### Tabela `mdfes`
- `focus_ref`, `status`, `chave_acesso`, `protocolo`
- `pdf_path`, `xml_path`, `xml_content`
- `viagem_id`: Vinculado à viagem (não à entrega)

### Tabela `gnres` (Guias de Recolhimento)
- Vinculada a `empresa_id`, `cargas_id`, `nfe_id`
- Status: `pendente`, `autorizada`, `rejeitada`

### Integração Focus NFe
- **CT-e**: Emissão automática na transição para `saiu_para_entrega` (Edge Function `focusnfe-cte`)
- **MDF-e**: Emissão manual via `focusnfe-mdfe`, vinculada à viagem
- **Validação**: Edge Function `validate-nfe` valida XML da NF-e
- **Códigos IBGE**: Resolução de 7 dígitos para municípios (lib `ibgeLookup`)

---

## 14. Sistema de Mensagens (Chat)

### Arquitetura

```
chats (1:1 com entregas)
├── chat_participantes (N:N)
│   ├── Embarcador (user_id + empresa_id)
│   ├── Transportadora (user_id + empresa_id)
│   └── Motorista (user_id + motorista_id)
│
└── mensagens
    ├── sender_id, sender_nome, sender_tipo
    ├── conteudo (texto)
    ├── anexo_url, anexo_nome, anexo_tipo, anexo_tamanho
    └── lida (boolean)
```

### Criação automática
- O chat é criado via Edge Function `create-chat-for-entrega` quando qualquer parte inicia conversa
- Participantes são adicionados automaticamente: todos usuários das empresas envolvidas + motorista

### Componentes
- `ChatList` — Lista de conversas com último mensagem e badge de não lidas
- `ChatArea` — Área de mensagens com scroll, bolhas, timestamps
- `ChatDetailsSheet` — Detalhes do chat (entrega, participantes)
- `AttachmentPreview` — Preview de anexos (imagem, PDF, documento)
- `MessageBubble` — Bolha de mensagem com avatar e status de leitura

### Hooks
- `useChats` — Busca e cache de chats com Realtime subscription
- `useChatSheet` — Estado do sheet de chat

### Segurança (RLS)
- Chats e participantes: somente leitura para participantes, sem CRUD pelo cliente
- Mensagens: participantes podem ler e inserir, não deletar

---

## 15. Sistema de Notificações

### Tabela `notificacoes`
- `user_id`: Destinatário
- `empresa_id`: Empresa relacionada
- `tipo`: Enum (`status_entrega_alterado`, `cte_anexado`, `nova_mensagem`, `motorista_adicionado`, `nova_carga`)
- `titulo`, `mensagem`, `dados` (JSON), `link` (URL para navegação)
- `lida`: Boolean

### Triggers de disparo
| Trigger | Quando | Notifica |
|---|---|---|
| `notify_entrega_status_change` | `entregas.status` muda | Embarcador + Transportadora + Motorista |
| `notify_cte_attached` | `entregas.cte_url` preenchido | Embarcador |
| `notify_new_message` | Nova mensagem inserida | Todos participantes exceto remetente |
| `notify_motorista_added` | Novo motorista criado | Gestores da transportadora |

### Frontend
- `NotificacoesContext` — Context com Realtime subscription + contagem de não lidas
- `NotificacoesDropdown` — Dropdown no header com lista e ações
- `NotificationToast` — Toast animado para notificações em tempo real
- `usePushNotifications` — Hook para Web Push via Service Worker

### Push Notifications
- Edge Function `push-notifications` com Web Push API
- VAPID keys para autenticação
- Remoção automática de subscriptions expiradas (410/404)

---

## 16. Assistente IA (Hubinho)

### Arquitetura

- **Identidade visual**: Glassmorphism (blur 32px), animações suaves via Framer Motion
- **Disponibilidade**: Página dedicada (`/embarcador/assistente`, `/transportadora/assistente`) + widget flutuante
- **Backend**: Webhooks N8n
- **Autenticação**: JWT do usuário logado
- **Persistência**: Tabelas `ai_chat` (sessão) e `ai_chat_messages` (mensagens)
- **Session ID**: Único por conversa, permite múltiplas sessões

### Componentes
| Componente | Descrição |
|---|---|
| `AIAssistantButton` | Botão flutuante para abrir o chat |
| `AIAssistantChat` | Container principal do chat |
| `ChatContainer` | Área de mensagens com scroll |
| `ChatHeader` | Cabeçalho com avatar do Hubinho |
| `ChatInput` | Input com envio por Enter |
| `ChatMessage` | Bolha de mensagem (user/AI) com Markdown |
| `SuggestionBubbles` | Sugestões de perguntas iniciais |
| `TypingIndicator` | Animação de "digitando..." |
| `WelcomeAnimation` | Animação de boas-vindas |
| `ImmersiveBackground` | Background com blur e gradientes |
| `CardImmersiveBackground` | Variante para cards |

### Hook: `useAIChatHistory`
Gerencia o histórico de conversas com paginação e persistência.

---

## 17. Mapas e Geolocalização

### Componentes de Mapa

| Componente | Tipo | Uso |
|---|---|---|
| `CargasGoogleMap` | Google Maps | Mapa de cargas com marcadores O/D |
| `EntregasGoogleMap` | Google Maps | Mapa de entregas com rota |
| `RouteGoogleMap` | Google Maps | Rota entre dois pontos |
| `MonitoramentoLeafletMap` | Leaflet | Monitoramento admin com geofences |
| `MonitoringMap` | Google Maps | Wrapper para monitoramento |
| `GestaoLeafletMap` | Leaflet | Mapa de gestão de cargas |
| `DetailPanelLeafletMap` | Leaflet | Mapa no painel de detalhes |
| `LocationPickerMap` | Leaflet | Seletor de localização |
| `PublicTrackingMap` | Leaflet | Rastreamento público |
| `RastreamentoMap` | Google Maps | Mapa de rastreamento |
| `ViagemMultiPointMap` | Google Maps | Mapa multi-ponto de viagem |
| `ViagemTrackingMapDialog` | Dialog | Modal de histórico de tracking com stats |
| `TrackingHistoryGoogleMarkers` | Google Maps | Marcadores do histórico |
| `ViagemTrackingMarkers` | Google Maps | Marcadores de viagem (coloridos por status) |

### Sub-componentes
- `DriverMarker` — Marcador do motorista com direção
- `RouteMarker` — Marcadores de rota (O/D)
- `SelectionPanel` — Painel de seleção de motoristas/entregas
- `TruckIcon` — Ícone de caminhão com rotação
- `DriveHoveredCard` — Card ao hover no motorista

### Hooks de Mapa
- `useMapFitBounds` — Ajusta bounds do mapa para conter todos os marcadores
- `useMapRoutes` — Busca e renderiza rotas entre pontos
- `useOSRMRoute` — Traça rotas via API OSRM (realista em estradas)
- `useReverseGeocode` — Geocodificação reversa (coordenadas → endereço)

### Geofences (Admin)
- Tabela `geofences`: raio em metros, notificação de entrada/saída, mudança automática de status
- `GeofenceOverlay` — Overlay visual no mapa
- `RoutePlayback` — Replay de rota com controle de velocidade

---

## 18. Edge Functions (Backend)

### Lista completa (13 funções)

| Função | Propósito | Trigger/Chamada |
|---|---|---|
| `accept-invite` | Aceitar convite para empresa (valida token, cria usuario, vincula filial, adiciona role) | POST manual |
| `invite-user` | Enviar convite por email (valida ADMIN, cria company_invites, envia email) | POST manual |
| `create-driver-auth` | Criar motorista com auth (cria auth.user + usuarios + roles + motoristas + veiculos + ajudantes, com rollback) | POST manual |
| `delete-driver-auth` | Excluir motorista e toda a cadeia (desvincula veículos, carrocerias, deleta ajudantes, referências, usuario, auth) | POST manual |
| `reset-driver-password` | Redefinir senha de motorista (valida mesma empresa, usa admin API) | POST manual |
| `create-chat-for-entrega` | Criar chat para entrega (idempotente, adiciona participantes automaticamente) | POST manual |
| `create-admin-user` | Criar admin da torre (apenas super_admin, cria auth + torre_users) | POST manual |
| `push-notifications` | Enviar push (GET: VAPID key, POST: envia notificação, limpa expiradas) | GET/POST |
| `finalizar-entrega` | Finalizar entrega com validações (comprovantes, documentos) | POST manual |
| `focusnfe-cte` | Emitir CT-e via API Focus NFe (monta payload, envia, salva referência) | POST automático |
| `focusnfe-mdfe` | Emitir MDF-e via API Focus NFe | POST manual |
| `validate-nfe` | Validar XML de NF-e (extrai metadados, persiste em tabela nfes) | POST manual |
| `migrate-fleet-photos` | Migrar fotos de frota entre buckets | POST manual |

---

## 19. Triggers e Automações

### Geração de Códigos
| Trigger | Tabela | Formato |
|---|---|---|
| `generate_carga_codigo` | cargas | `CRG-YYYY-NNNN` |
| `generate_entrega_codigo` | entregas | `CRG-YYYY-NNNN-E01` |
| `generate_chamado_codigo` | chamados | `CH-YYYYMMDD-NNNN` |
| Viagens | viagens | `VGM-YYYY-NNNN` (com `started_at` automático) |

### Timestamps
- `update_updated_at_column()` — BEFORE UPDATE em múltiplas tabelas
- `update_locations_updated_at()` — BEFORE UPDATE em `locations`

### Sincronização e Lógica
| Trigger | Ação |
|---|---|
| `sync_localizacoes_to_tracking_historico` | Copia localização para histórico (distância > 50m OU tempo > 5min) |
| `release_weight_on_entrega_delete` | Devolve `peso_alocado_kg` para a carga ao deletar entrega |
| `update_chat_updated_at` | Atualiza `chats.updated_at` ao inserir mensagem |
| `proteger_finalizacao_viagem` | Impede finalização sem documentos completos |
| Limpeza de `viagem_entregas` | Remove registros órfãos ao excluir/cancelar entregas |

### Notificações (via triggers)
- `notify_entrega_status_change` — Mudança de status da entrega
- `notify_cte_attached` — CT-e anexado
- `notify_new_message` — Nova mensagem no chat
- `notify_motorista_added` — Novo motorista cadastrado

---

## 20. Segurança e RLS

### Padrões de Acesso

| Padrão | Tabelas |
|---|---|
| **Por empresa** (`user_belongs_to_empresa`) | contatos_destino, config_fiscal, company_invites, driver_invite_links, certificados_digitais |
| **Por participação** (`is_chat_participant`) | chats, chat_participantes, mensagens |
| **Admin torre** (`is_admin`, `has_admin_role`) | chamados, torre_users, logs |
| **Próprias** (`auth.uid() = user_id`) | notificacoes, ai_chat, ai_chat_messages |
| **Marketplace** (all authenticated) | cargas, entregas, motoristas, veiculos, carrocerias, enderecos_carga, filiais, empresas |
| **Público** (sem auth) | driver_invite_links (ativos), empresas (campos públicos) |

### Exceções intencionais
- Cargas e motoristas têm `Allow all for authenticated` para permitir visibilidade cross-company no marketplace
- Locations: INSERT/UPDATE restrito ao próprio motorista; SELECT aberto para autenticados

### Proteções adicionais
- Edge Functions com `SET search_path = public` para mitigar injeção
- Re-autenticação para operações sensíveis (atualização de senha)
- Certificados digitais: acesso restrito a ADMINs da empresa

---

## 21. Fluxos Operacionais Completos

### Fluxo 1: Embarcador Publica Carga
1. Acessa `/embarcador/cargas` → "Nova Carga"
2. Preenche wizard: origem, remetente, destino, destinatário, resumo, requisitos, NF-e
3. INSERT em `cargas` (status: `rascunho`) + `enderecos_carga` (origem e destino)
4. Trigger gera código `CRG-YYYY-NNNN`
5. Embarcador clica "Publicar" → status: `publicada`
6. Carga aparece no marketplace para transportadoras

### Fluxo 2: Transportadora Aceita Carga
1. Acessa `/transportadora/cargas` → vê cargas publicadas
2. Seleciona carga → modal de detalhes com mapa
3. Escolhe motorista, veículo, carroceria, peso
4. RPC `accept_carga_tx` → cria entrega, debita peso, atualiza status
5. Entrega associada à viagem ativa do motorista (ou cria nova viagem)
6. Motorista recebe notificação

### Fluxo 3: Motorista Executa Entrega
1. App Flutter mostra entregas atribuídas
2. Inicia coleta → status: `saiu_para_coleta` → trigger notifica partes
3. GPS atualiza `locations` continuamente → tracking_historico grava pontos
4. Chega no local → status: `saiu_para_entrega` → emissão automática de CT-e
5. Realiza entrega: assinatura, foto, nome do recebedor
6. Finaliza → status: `entregue` → prova de entrega registrada

### Fluxo 4: Chat por Entrega
1. Qualquer parte acessa chat da entrega
2. Edge Function `create-chat-for-entrega` cria chat se não existir
3. Participantes adicionados automaticamente (embarcador + transportadora + motorista)
4. Mensagens via Realtime WebSocket (instantâneo)
5. Trigger `notify_new_message` cria notificação para outros participantes

### Fluxo 5: Convite de Usuário
1. Admin acessa "Usuários" → "Convidar"
2. Preenche email, cargo, filial
3. Edge Function `invite-user` → cria `company_invites` + envia email
4. Usuário clica link → `/login?invite=TOKEN`
5. Edge Function `accept-invite` → cria usuario, vincula filial, adiciona role

### Fluxo 6: Cadastro de Motorista
1. Gestão de frota → "Novo Motorista"
2. Wizard: dados pessoais → credenciais → veículo → ajudante (opcional) → resumo
3. Edge Function `create-driver-auth` (transação com rollback):
   - Cria auth.user → usuarios → user_roles → motoristas → veículos → ajudantes
4. Trigger `notify_motorista_added` → notifica gestores

### Fluxo 7: Finalização de Viagem
1. Transportadora seleciona viagem → "Finalizar"
2. Validação frontend: todas entregas terminais? Canhoto + NF-e + CT-e em cada? MDF-e autorizado?
3. Se válido → `finalizar_viagem()` calcula KM final e encerra
4. Se inválido → exibe alertas de pendências com badges nos cards de entrega
5. Trigger `proteger_finalizacao_viagem` valida novamente no banco

### Fluxo 8: Rastreamento Público
1. Destinatário recebe `tracking_code` da entrega
2. Acessa `/rastreio` → insere código
3. `PublicTrackingMap` mostra posição atual do motorista + status da entrega
4. Sem autenticação necessária

---

## 22. Hooks Customizados

| Hook | Arquivo | Descrição |
|---|---|---|
| `useAuth` | `useAuth.tsx` | Context de autenticação: login, logout, roles, redirect por perfil. Inclui `RequireAuth` para rotas protegidas |
| `useUserContext` | `useUserContext.tsx` | Context do usuário logado: empresa_id, tipo, filiais, nome, avatar |
| `useMobile` | `use-mobile.tsx` | Detecta viewport mobile (< 768px) |
| `useToast` | `use-toast.ts` | Sistema de toasts (shadcn) |
| `useChats` | `useChats.ts` | Busca chats do usuário com Realtime subscription |
| `useChatSheet` | `useChatSheet.ts` | Estado do sheet de chat (aberto/fechado, chat selecionado) |
| `useNotificacoes` | `useNotificacoes.ts` | Busca notificações com Realtime subscription |
| `usePushNotifications` | `usePushNotifications.ts` | Registro e gerenciamento de Web Push |
| `useAIChatHistory` | `useAIChatHistory.ts` | Histórico de conversas com o Hubinho |
| `useCnpjLookup` | `useCnpjLookup.ts` | Consulta CNPJ via BrasilAPI (razão social, endereço) |
| `useOSRMRoute` | `useOSRMRoute.ts` | Busca rota via API OSRM (pontos intermediários para renderizar em estradas) |
| `useRealtimeLocalizacoes` | `useRealtimeLocalizacoes.ts` | Subscrição Realtime em `locations` para mapa ao vivo |
| `useReverseGeocode` | `useReverseGeocode.ts` | Coordenadas → endereço legível (Nominatim) |
| `useTableSort` | `useTableSort.ts` | Ordenação de tabelas (coluna, direção) |
| `useDraggableColumns` | `useDraggableColumns.ts` | Colunas reordenáveis via drag-and-drop |
| `useViewModePreference` | `useViewModePreference.ts` | Persiste preferência de modo de visualização (entregas vs viagens) |
| `useRemainingViewportHeight` | `useRemainingViewportHeight.ts` | Calcula altura disponível restante para layouts responsivos |

---

## 23. Bibliotecas Utilitárias

| Arquivo | Descrição |
|---|---|
| `api.ts` | Funções de API genéricas para Supabase |
| `chatApi.ts` | Funções específicas do chat (buscar chats, enviar mensagem, marcar como lida) |
| `chatService.ts` | Lógica de serviço do chat (criação, participantes) |
| `documentHelpers.ts` | Helpers para manipulação de documentos (upload, download, preview) |
| `fetchAllTrackingHistorico.ts` | Busca em lote de tracking_historico (1000/chamada), inclui `fetchViagemStatus` e `fetchDeliveryEventsForViagem` para coloração dinâmica |
| `finalizarEntregaService.ts` | Serviço de finalização de entrega com validações |
| `ibgeLookup.ts` | Resolução de códigos IBGE de 7 dígitos para municípios |
| `masks.ts` | Máscaras de input (CPF, CNPJ, telefone, CEP, placa) |
| `nfeXmlParser.ts` | Parser de XML da NF-e (extrai chave de acesso, número, valor, remetente, destinatário) |
| `reportExport.ts` | Exportação de relatórios para PDF (jsPDF) e Excel (xlsx) |
| `userSession.ts` | Funções de sessão do usuário |
| `utils.ts` | Utilitários gerais (`cn` para merge de classes Tailwind) |

---

## 24. Design System e UI

### Componentes shadcn/ui (40+)
Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, Form, HoverCard, Input, InputOTP, Label, MaskedInput, Menubar, NavigationMenu, Pagination, PasswordInput, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, SortableTableHead, DraggableTableHead, Switch, Table, Tabs, Textarea, Toast, Toggle, ToggleGroup, Tooltip

### Temas
- Suporte light/dark via `next-themes`
- CSS variables HSL em `index.css`
- Tokens semânticos: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, etc.

### Componentes Customizados
- `SplashScreen` — Tela de loading animada pós-login
- `StatCard` — Card de KPI com ícone, valor e variação
- `Pagination` — Paginação com controle de items por página
- `DeleteConfirmDialog` — Dialog de confirmação de exclusão

---

## 25. PWA e Service Worker

- **Manifesto PWA**: Ícones em `public/pwa-192x192.png` e `public/pwa-512x512.png`
- **Service Worker**: `public/sw.js` para cache e push notifications
- **Plugin**: `vite-plugin-pwa` para geração automática do manifesto
- **Web Push**: Registro de subscription e recebimento de notificações em background

---

## 26. Schema do Banco de Dados

### Tabelas Principais (30+)

| Tabela | Descrição | Relações chave |
|---|---|---|
| `empresas` | Embarcadores e Transportadoras | — |
| `filiais` | Filiais das empresas | → empresas |
| `usuarios` | Perfis de usuários | → auth.users, → empresas |
| `usuarios_filiais` | Vínculo usuário ↔ filial | → usuarios, → filiais |
| `user_roles` | Roles globais | → auth.users |
| `torre_users` | Admins da torre | → auth.users |
| `motoristas` | Dados de motoristas | → empresas, → auth.users |
| `ajudantes` | Ajudantes de motoristas | → motoristas |
| `veiculos` | Veículos de transporte | → empresas, → motoristas |
| `carrocerias` | Carrocerias/implementos | → empresas, → motoristas |
| `cargas` | Cargas publicadas | → empresas, → enderecos_carga, → filiais |
| `enderecos_carga` | Endereços de origem/destino | → cargas |
| `contatos_destino` | Contatos de destinatários | → empresas |
| `entregas` | Entregas individuais | → cargas, → motoristas, → veiculos, → carrocerias |
| `entrega_eventos` | Eventos/timeline da entrega | → entregas |
| `viagens` | Viagens (VGM) | → motoristas, → veiculos, → carrocerias |
| `viagem_entregas` | Junção viagem ↔ entrega | → viagens, → entregas |
| `locations` | Posição atual do motorista | → motoristas (UNIQUE) |
| `tracking_historico` | Histórico de GPS | → viagens |
| `chats` | Chats por entrega | → entregas (1:1) |
| `chat_participantes` | Participantes do chat | → chats, → empresas, → motoristas |
| `mensagens` | Mensagens do chat | → chats |
| `notificacoes` | Notificações do sistema | → auth.users, → empresas |
| `nfes` | Notas Fiscais Eletrônicas | → cargas, → empresas |
| `ctes` | CT-es | → entregas, → empresas |
| `mdfes` | MDF-es | → viagens, → empresas |
| `mdfe_documentos` | Documentos vinculados ao MDF-e | → mdfes, → ctes, → nfes |
| `manifestos` | Manifestos (legado) | → viagens, → empresas |
| `manifesto_ctes` | Junção manifesto ↔ CT-e | → manifestos, → ctes |
| `config_fiscal` | Config fiscal por empresa | → empresas (1:1) |
| `certificados_digitais` | Certificados A1 | → empresas (1:1) |
| `gnres` | Guias de recolhimento | → empresas, → cargas, → nfes |
| `documentos_validacao` | Docs para validação admin | → motoristas, → veiculos, → carrocerias |
| `geofences` | Cercas virtuais | → entregas |
| `chamados` | Tickets de suporte | → empresas, → torre_users |
| `chamado_mensagens` | Mensagens dos chamados | → chamados |
| `company_invites` | Convites para empresa | → filiais |
| `driver_invite_links` | Links de convite para motorista | — |
| `auditoria_logs` | Logs de auditoria | — |
| `ai_chat` | Sessões do Hubinho | → usuarios |
| `ai_chat_messages` | Mensagens do Hubinho | → ai_chat |

---

## 27. Enums e Constantes

```sql
-- Status de carga
status_carga: rascunho | publicada | parcialmente_alocada | totalmente_alocada | finalizada | cancelada

-- Status de entrega
status_entrega: aguardando | saiu_para_coleta | saiu_para_entrega | entregue | problema | cancelada

-- Tipo de empresa
tipo_empresa: EMBARCADOR | TRANSPORTADORA

-- Classe de empresa
classe_empresa: matriz | filial

-- Cargo de usuário
usuario_cargo: ADMIN | OPERADOR

-- Role de admin
admin_role: super_admin | admin | suporte

-- Tipo de cadastro motorista
tipo_cadastro_motorista: frota | autonomo

-- Tipo de notificação
tipo_notificacao: status_entrega_alterado | cte_anexado | nova_mensagem | motorista_adicionado | nova_carga

-- Tipo de precificação
tipo_precificacao: por_tonelada | por_km | fixo | por_m3

-- Tipo de carga
tipo_carga: (definido pelo embarcador)

-- Tipo de endereço
tipo_endereco: origem | destino

-- Autor IA
user_ai: user | ai

-- Status de chamado
status_chamado: aberto | em_andamento | resolvido | fechado

-- Prioridade de chamado
prioridade_chamado: baixa | media | alta | urgente

-- Categoria de chamado
categoria_chamado: bug | duvida | sugestao | financeiro | operacional | outros
```

---

## 28. Storage (Buckets)

| Bucket | Público | Uso |
|---|---|---|
| `notas-fiscais` | ❌ | XMLs e PDFs de NF-e |
| `fotos-frota` | ✅ | Fotos de veículos e carrocerias |
| `chat-anexos` | ✅ | Arquivos enviados no chat |
| `provas-entrega` | ❌ | Canhotos, fotos de comprovantes |
| `documentos-validacao` | ❌ | Documentos para validação (CNH, CRLV, etc.) |

---

## 29. Contexto Acumulado e Decisões de Arquitetura

### Decisões Técnicas Consolidadas

1. **Modelo B2B puro**: Termos "Remetente/Destinatário" em vez de "Origem/Destino". Razão Social e CNPJ em destaque, endereços em detalhes expandidos.

2. **Tabela unificada `empresas`**: Embarcadores e Transportadoras na mesma tabela, diferenciados por `tipo`. Sem tabelas redundantes por perfil.

3. **Trip-Centric Tracking**: Rastreamento vinculado a viagens (`VGM-YYYY-NNNN`), não a entregas individuais. Permite múltiplas entregas por trajeto.

4. **Offline-first na telemetria**: `tracked_at` (timestamp real) + `request_id` (idempotência) no tracking_historico para cenários sem internet.

5. **Tabela `locations` como posição atual**: Uma linha por motorista (UNIQUE), atualizada constantemente. `tracking_historico` acumula os pontos.

6. **Documentos em tabelas próprias**: NF-es, CT-es, MDF-es em tabelas dedicadas com `xml_content`. Sem colunas de URL nas tabelas principais (exceto legado em `entregas`).

7. **POD Digital prioritário**: Assinatura digital + GPS + timestamp + foto como comprovante jurídico. Canhoto físico é exceção híbrida.

8. **CT-e automático**: Emissão disparada automaticamente na transição para `saiu_para_entrega`, usando XML da NF-e já persistido.

9. **Geração de códigos via triggers**: `CRG-YYYY-NNNN`, `VGM-YYYY-NNNN`, `CH-YYYYMMDD-NNNN` — garante unicidade e consistência.

10. **RLS com funções SQL**: `user_belongs_to_empresa`, `is_chat_participant`, `is_admin` — reusáveis e auditáveis.

11. **Marketplace aberto**: Cargas e motoristas com `Allow all for authenticated` para visibilidade cross-company.

12. **Seletor de modo de visualização**: Portal da transportadora alterna entre "Por Entregas" e "Por Viagens" com persistência de preferência.

13. **Coloração dinâmica no tracking**: Pontos de viagem coloridos pelo status da viagem (âmbar/azul/verde/vermelho). Pontos de entrega coloridos pelo status da entrega no momento da captura.

14. **Validação de finalização em camadas**: Frontend exibe alertas + trigger no banco impede finalização sem documentos completos.

15. **OSRM para rotas**: Traçado realista em estradas (não linha reta) com busca em lote de 1000 registros.

16. **Focus NFe com config_fiscal**: Regime tributário, CFOP, série/numeração com bloqueio `FOR UPDATE` para concorrência.

17. **IBGE 7 dígitos**: Resolução obrigatória de códigos de município para documentos fiscais.

18. **Assistente IA (Hubinho)**: Integrado via N8n webhooks com persistência de sessão e identidade visual imersiva (glassmorphism).

---

*Documento gerado em 2026-02-26 — HubFrete Platform v1.0*
*Baseado no contexto completo acumulado durante o desenvolvimento.*
