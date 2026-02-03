# HubFrete - Documentação Técnica Completa

> Sistema de gestão de fretes que conecta Embarcadores, Transportadoras e Motoristas.

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Estrutura de Usuários e Permissões](#estrutura-de-usuários-e-permissões)
3. [Fluxo de Cargas e Entregas](#fluxo-de-cargas-e-entregas)
4. [Sistema de Rastreamento](#sistema-de-rastreamento)
5. [Sistema de Mensagens (Chat)](#sistema-de-mensagens-chat)
6. [Sistema de Notificações](#sistema-de-notificações)
7. [Edge Functions](#edge-functions)
8. [Triggers e Automações](#triggers-e-automações)
9. [Políticas de Segurança (RLS)](#políticas-de-segurança-rls)
10. [Fluxos Completos Passo a Passo](#fluxos-completos-passo-a-passo)

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HUBFRETE PLATFORM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐         │
│   │  EMBARCADOR  │    │  TRANSPORTADORA  │    │    MOTORISTA     │         │
│   │    Portal    │    │      Portal      │    │      Portal      │         │
│   └──────┬───────┘    └────────┬─────────┘    └────────┬─────────┘         │
│          │                     │                       │                    │
│          └─────────────────────┼───────────────────────┘                    │
│                                │                                            │
│                    ┌───────────▼────────────┐                               │
│                    │      SUPABASE          │                               │
│                    │  ┌─────────────────┐   │                               │
│                    │  │  Auth (Users)   │   │                               │
│                    │  ├─────────────────┤   │                               │
│                    │  │   Database      │   │                               │
│                    │  │  (PostgreSQL)   │   │                               │
│                    │  ├─────────────────┤   │                               │
│                    │  │ Edge Functions  │   │                               │
│                    │  ├─────────────────┤   │                               │
│                    │  │    Storage      │   │                               │
│                    │  ├─────────────────┤   │                               │
│                    │  │   Realtime      │   │                               │
│                    │  └─────────────────┘   │                               │
│                    └────────────────────────┘                               │
│                                │                                            │
│                    ┌───────────▼────────────┐                               │
│                    │   TORRE DE CONTROLE    │                               │
│                    │    (Admin Panel)       │                               │
│                    └────────────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tipos de Usuários

| Tipo | Descrição | Portal |
|------|-----------|--------|
| **Embarcador** | Empresa que publica cargas para transporte | `/embarcador/*` |
| **Transportadora** | Empresa que aceita cargas e gerencia frota | `/transportadora/*` |
| **Motorista** | Realiza entregas e atualiza status em tempo real | `/motorista/*` |
| **Admin (Torre)** | Administração geral da plataforma | `/admin/*` |

---

## 2. Estrutura de Usuários e Permissões

### Hierarquia de Tabelas

```
auth.users (Supabase Auth)
    │
    ├── usuarios (perfil do usuário no sistema)
    │       │
    │       └── usuarios_filiais (vínculo com filiais)
    │               │
    │               └── filiais
    │                       │
    │                       └── empresas
    │
    ├── user_roles (papel: embarcador/transportadora/motorista)
    │
    ├── motoristas (dados específicos de motoristas)
    │
    └── torre_users (usuários administrativos)
```

### Tabela: `empresas`
```sql
-- Tipos de empresa
tipo: EMBARCADOR | TRANSPORTADORA

-- Classes de empresa  
classe: matriz | filial
```

### Tabela: `filiais`
```sql
-- Cada empresa pode ter múltiplas filiais
empresa_id    → empresas.id
is_matriz     → boolean (identifica a matriz)
```

### Tabela: `usuarios`
```sql
auth_user_id  → auth.users.id
cargo         → ADMIN | OPERADOR
```

### Tabela: `usuarios_filiais`
```sql
-- Vincula usuários a filiais (muitos-para-muitos)
usuario_id    → usuarios.id
filial_id     → filiais.id
cargo_na_filial → ADMIN | OPERADOR
```

### Tabela: `user_roles`
```sql
-- Define o papel global do usuário
user_id       → auth.users.id
role          → embarcador | transportadora | motorista
```

### Funções de Verificação de Permissão

```sql
-- Verifica se usuário pertence a uma empresa
user_belongs_to_empresa(_user_id, _empresa_id) → boolean

-- Retorna o empresa_id do usuário
get_user_empresa_id(_user_id) → bigint

-- Retorna tipo da empresa (EMBARCADOR/TRANSPORTADORA)
get_user_empresa_tipo(_user_id) → text

-- Verifica se tem role específico
has_role(_user_id, _role) → boolean

-- Verifica se é admin da torre
is_admin(_user_id) → boolean
has_admin_role(_user_id, _role) → boolean
```

---

## 3. Fluxo de Cargas e Entregas

### Diagrama de Estados - Carga

```
                    ┌─────────────┐
                    │  RASCUNHO   │
                    └──────┬──────┘
                           │ (publicar)
                           ▼
                    ┌─────────────┐
           ┌────────│  PUBLICADA  │────────┐
           │        └──────┬──────┘        │
           │               │ (aceitar)     │
           │               ▼               │
           │   ┌───────────────────────┐   │
           │   │ PARCIALMENTE_ALOCADA  │   │
           │   └───────────┬───────────┘   │
           │               │ (100% alocado)│
           │               ▼               │
           │   ┌───────────────────────┐   │
           │   │  TOTALMENTE_ALOCADA   │   │
           │   └───────────┬───────────┘   │
           │               │               │
           │               ▼               │
           │      ┌────────────────┐       │
           │      │   FINALIZADA   │       │
           │      └────────────────┘       │
           │                               │
           └──────────► CANCELADA ◄────────┘
```

### Diagrama de Estados - Entrega

```
                    ┌─────────────┐
                    │ AGUARDANDO  │
                    └──────┬──────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   SAIU_PARA_COLETA     │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │   SAIU_PARA_ENTREGA    │
              └───────────┬────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        ┌──────────┐ ┌─────────┐ ┌───────────┐
        │ ENTREGUE │ │PROBLEMA │ │ CANCELADA │
        └──────────┘ └─────────┘ └───────────┘
```

### Tabela: `cargas`

```sql
-- Informações da carga
codigo            → gerado automaticamente (CRG-YYYY-NNNN)
empresa_id        → embarcador que publicou
filial_id         → filial de origem
peso_kg           → peso total
peso_disponivel_kg → peso ainda disponível para alocação
permite_fracionado → pode dividir entre motoristas
status            → enum status_carga

-- Endereços (relacionamentos)
endereco_origem_id  → enderecos_carga.id
endereco_destino_id → enderecos_carga.id

-- Contato do destinatário
contato_destino_id → contatos_destino.id
```

### Tabela: `entregas`

```sql
-- Vínculo com carga
carga_id          → cargas.id
codigo            → gerado automaticamente (CRG-YYYY-NNNN-E01)

-- Atribuição
motorista_id      → motoristas.id
veiculo_id        → veiculos.id
carroceria_id     → carrocerias.id

-- Peso alocado (para cargas fracionadas)
peso_alocado_kg   → quanto desta carga o motorista levou

-- Status e comprovantes
status            → enum status_entrega
cte_url           → documento CT-e
foto_comprovante_entrega → prova de entrega
nome_recebedor    → quem recebeu
```

### Função de Aceitação de Carga (Transação)

```sql
accept_carga_tx(
  p_motorista_id,
  p_carga_id,
  p_veiculo_id,
  p_carroceria_id,
  p_peso_kg
) → jsonb

-- Esta função:
-- 1. Valida se veículo pertence ao motorista
-- 2. Valida capacidade do veículo
-- 3. Valida se carga está disponível
-- 4. Valida peso disponível
-- 5. Debita capacidade do veículo
-- 6. Cria registro de entrega
-- 7. Atualiza peso_disponivel_kg da carga
-- 8. Muda status da carga se totalmente alocada
```

---

## 4. Sistema de Rastreamento

### Arquitetura de Rastreamento

```
┌─────────────────┐
│    MOTORISTA    │
│   (GPS/Mobile)  │
└────────┬────────┘
         │ (UPDATE em tempo real)
         ▼
┌─────────────────────┐
│     locations       │  ← Posição atual do motorista
│  (uma linha por     │     (atualizada constantemente)
│   motorista)        │
└────────┬────────────┘
         │ (TRIGGER: sync_localizacoes_to_tracking_historico)
         ▼
┌─────────────────────┐
│ tracking_historico  │  ← Histórico de posições
│  (múltiplas linhas  │     (gravado a cada 50m ou 5min)
│   por entrega)      │
└─────────────────────┘
```

### Tabela: `locations`
```sql
-- Posição atual do motorista (uma linha por motorista)
motorista_id  → motoristas.id (UNIQUE)
entrega_id    → entrega ativa (opcional)
latitude, longitude
speed, heading, altitude, accuracy
updated_at    → atualizado por trigger
```

### Tabela: `tracking_historico`
```sql
-- Histórico de posições (múltiplas linhas por entrega)
entrega_id    → entregas.id
status        → status da entrega no momento
latitude, longitude
velocidade, bussola_pos, altitude, precisao
created_at
```

### Trigger: `sync_localizacoes_to_tracking_historico`

Esta função é acionada a cada UPDATE em `locations`:

```sql
-- Lógica:
-- 1. Busca TODAS as entregas ativas do motorista
-- 2. Para cada entrega:
--    a. Busca último ponto salvo
--    b. Calcula distância (Haversine)
--    c. Calcula tempo decorrido
--    d. Salva se: distância > 50m OU tempo > 5 minutos
```

**Importante**: Uma atualização de localização pode gerar MÚLTIPLOS registros no histórico se o motorista tiver várias entregas ativas.

---

## 5. Sistema de Mensagens (Chat)

### Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                          CHATS                               │
├──────────────────────────────────────────────────────────────┤
│  entrega_id (1:1 com entregas)                               │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │ chat_participantes │    │         mensagens              │  │
│  │                 │    │                                 │  │
│  │ • Embarcador    │    │ • sender_id                     │  │
│  │ • Transportadora│◄───│ • sender_tipo                   │  │
│  │ • Motorista     │    │ • conteudo                      │  │
│  │                 │    │ • anexo_url                     │  │
│  └─────────────────┘    └─────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Regras de Criação

O chat é criado quando:
1. Motorista aceita uma carga (cria entrega)
2. Qualquer parte interessada inicia conversa

**Participantes são adicionados automaticamente:**
- Todos usuários da empresa embarcadora
- Todos usuários da empresa transportadora
- O motorista da entrega

### Segurança

```sql
-- Função para verificar participação
is_chat_participant(p_chat_id, p_user_id) → boolean

-- RLS: Só participantes podem ler/escrever
SELECT: is_chat_participant(chat_id, auth.uid())
INSERT: sender_id = auth.uid() AND is_chat_participant(...)
```

---

## 6. Sistema de Notificações

### Tabela: `notificacoes`

```sql
user_id       → destinatário (auth.users.id)
empresa_id    → empresa relacionada (opcional)
tipo          → enum tipo_notificacao
titulo        → título da notificação
mensagem      → conteúdo
dados         → jsonb com dados adicionais
link          → URL para navegação
lida          → boolean
```

### Tipos de Notificação

| Tipo | Quando é disparada |
|------|-------------------|
| `status_entrega_alterado` | Mudança de status na entrega |
| `cte_anexado` | CT-e foi anexado à entrega |
| `nova_mensagem` | Nova mensagem no chat |
| `motorista_adicionado` | Novo motorista cadastrado |
| `nova_carga` | Nova carga publicada |

### Triggers de Notificação

#### 1. `notify_entrega_status_change`
```sql
-- Dispara quando: entregas.status muda
-- Notifica:
--   • Usuários do embarcador
--   • Usuários da transportadora
--   • O motorista (se diferente de quem alterou)
```

#### 2. `notify_cte_attached`
```sql
-- Dispara quando: entregas.cte_url é preenchido
-- Notifica: Usuários do embarcador
```

#### 3. `notify_new_message`
```sql
-- Dispara quando: nova mensagem inserida
-- Notifica: Todos participantes exceto remetente
```

#### 4. `notify_motorista_added`
```sql
-- Dispara quando: novo motorista criado
-- Notifica: Usuários da transportadora
```

### Push Notifications

O sistema suporta Web Push via Service Worker:

```
┌─────────────────┐
│    Trigger      │
│ (notify_xxx)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  notificacoes   │  ← Gravado no banco
└────────┬────────┘
         │ (Realtime subscription)
         ▼
┌─────────────────────────┐
│   Frontend React        │
│  (NotificacoesContext)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Edge Function:        │
│  push-notifications     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Web Push API          │
│  (Navegador)            │
└─────────────────────────┘
```

---

## 7. Edge Functions

### 1. `accept-invite`
**Propósito**: Aceitar convite para entrar em uma empresa

**Fluxo**:
1. Valida token de convite
2. Verifica se email corresponde
3. Cria registro em `usuarios` se não existir
4. Vincula a `usuarios_filiais`
5. Adiciona `user_roles`
6. Marca convite como aceito

---

### 2. `invite-user`
**Propósito**: Enviar convite para novo usuário

**Fluxo**:
1. Verifica se quem convida é ADMIN
2. Valida empresa e filial
3. Cria registro em `company_invites`
4. Envia email via Supabase Auth

---

### 3. `create-driver-auth`
**Propósito**: Criar motorista com conta de autenticação

**Fluxo**:
1. Cria usuário no `auth.users`
2. Cria registro em `usuarios`
3. Adiciona roles: `motorista` + `transportadora`
4. Cria registro em `motoristas`
5. Cria referências (se houver)
6. Cria ajudante (se houver)

**Rollback**: Se falhar após criar auth user, deleta o auth user

---

### 4. `delete-driver-auth`
**Propósito**: Excluir motorista e conta

**Fluxo**:
1. Desvincula veículos
2. Desvincula carrocerias
3. Deleta ajudantes
4. Deleta referências
5. Deleta motorista
6. Deleta user_roles
7. Deleta usuarios
8. Deleta auth.user

---

### 5. `reset-driver-password`
**Propósito**: Redefinir senha de motorista

**Fluxo**:
1. Valida permissão (mesmo empresa)
2. Usa `auth.admin.updateUserById` para alterar senha

---

### 6. `create-chat-for-entrega`
**Propósito**: Criar chat para uma entrega

**Fluxo**:
1. Busca entrega, carga e motorista
2. Verifica permissão (embarcador, transportadora ou motorista)
3. Cria chat se não existir
4. Resolve user_ids das empresas
5. Insere participantes (idempotente)

---

### 7. `create-admin-user`
**Propósito**: Criar usuário administrativo (torre)

**Requisito**: Apenas `super_admin` pode executar

**Fluxo**:
1. Cria auth.user com metadata `is_admin: true`
2. Cria registro em `torre_users`

---

### 8. `push-notifications`
**Propósito**: Enviar push notifications

**Endpoints**:
- `GET ?action=get-vapid-key`: Retorna chave pública VAPID
- `POST`: Envia notificação (apenas service role)

**Fluxo de envio**:
1. Busca subscriptions do(s) usuário(s)
2. Envia para cada endpoint
3. Remove subscriptions expiradas (410/404)

---

## 8. Triggers e Automações

### Triggers de Geração de Código

```sql
-- Cargas: CRG-YYYY-NNNN
generate_carga_codigo() 
  → BEFORE INSERT ON cargas

-- Entregas: CRG-YYYY-NNNN-E01
generate_entrega_codigo()
  → BEFORE INSERT ON entregas

-- Chamados: CH-YYYYMMDD-NNNN
generate_chamado_codigo()
  → BEFORE INSERT ON chamados
```

### Triggers de Timestamp

```sql
-- Atualiza updated_at automaticamente
update_updated_at_column()
  → BEFORE UPDATE ON várias tabelas

update_locations_updated_at()
  → BEFORE UPDATE ON locations
```

### Triggers de Sincronização

```sql
-- Sincroniza posição para histórico
sync_localizacoes_to_tracking_historico()
  → AFTER INSERT OR UPDATE ON locations
```

### Triggers de Notificação

```sql
notify_entrega_status_change()
  → AFTER UPDATE ON entregas
  → Quando: OLD.status != NEW.status

notify_cte_attached()
  → AFTER UPDATE ON entregas
  → Quando: OLD.cte_url IS NULL AND NEW.cte_url IS NOT NULL

notify_new_message()
  → AFTER INSERT ON mensagens

notify_motorista_added()
  → AFTER INSERT ON motoristas
```

### Trigger de Liberação de Peso

```sql
release_weight_on_entrega_delete()
  → BEFORE DELETE ON entregas
  
-- Quando entrega é deletada:
-- 1. Devolve peso_alocado_kg para carga
-- 2. Atualiza status da carga se necessário
```

### Trigger de Atualização de Chat

```sql
update_chat_updated_at()
  → AFTER INSERT ON mensagens
  
-- Atualiza chats.updated_at para ordenação
```

---

## 9. Políticas de Segurança (RLS)

### Padrões Comuns

#### Acesso por Empresa
```sql
-- Usuário pode ver dados da sua empresa
user_belongs_to_empresa(auth.uid(), empresa_id)
```

#### Acesso por Participação
```sql
-- Usuário participa do chat
is_chat_participant(chat_id, auth.uid())
```

#### Acesso Administrativo
```sql
-- Usuário é admin da torre
is_admin(auth.uid())
has_admin_role(auth.uid(), 'super_admin')
```

### Tabelas com RLS Restritivo

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `chats` | Participante | ❌ | ❌ | ❌ |
| `chat_participantes` | Participante | ❌ | ❌ | ❌ |
| `mensagens` | Participante | Participante | Participante | ❌ |
| `notificacoes` | Próprias | Sistema | Próprias | Próprias |
| `chamados` | Admin/Próprias | Autenticado | Admin | Admin |

### Tabelas com RLS Permissivo

```sql
-- Autenticado pode tudo
cargas, entregas, motoristas, veiculos, carrocerias, enderecos_carga, filiais, empresas
```

---

## 10. Fluxos Completos Passo a Passo

### Fluxo 1: Publicação de Carga pelo Embarcador

```
1. Embarcador acessa portal → /embarcador/cargas/gestao
2. Clica em "Nova Carga"
3. Preenche formulário:
   - Dados da carga (peso, tipo, descrição)
   - Endereço de origem
   - Endereço de destino
   - Dados do destinatário
   - Requisitos do veículo
4. Salva carga → INSERT em cargas (status: rascunho)
5. Trigger: generate_carga_codigo → CRG-2026-0001
6. INSERT em enderecos_carga (origem e destino)
7. Embarcador clica "Publicar"
8. UPDATE cargas SET status = 'publicada'
9. Carga aparece para transportadoras
```

### Fluxo 2: Aceitação de Carga pela Transportadora

```
1. Transportadora acessa → /transportadora/cargas-disponiveis
2. Vê lista de cargas publicadas
3. Clica em carga → abre modal com detalhes
4. Seleciona motorista e veículo
5. Define peso a transportar (se fracionada)
6. Confirma aceitação → RPC: accept_carga_tx
   - Valida capacidade do veículo
   - Cria entrega (status: aguardando)
   - Debita peso_disponivel_kg da carga
   - Atualiza status da carga
7. Trigger: generate_entrega_codigo → CRG-2026-0001-E01
8. Motorista recebe notificação
```

### Fluxo 3: Execução da Entrega pelo Motorista

```
1. Motorista acessa app → /motorista/entregas
2. Vê entrega atribuída
3. Inicia coleta → UPDATE status = 'saiu_para_coleta'
4. Trigger: notify_entrega_status_change
   - Notifica embarcador
   - Notifica transportadora
5. GPS atualiza locations continuamente
6. Trigger: sync_localizacoes_to_tracking_historico
   - Grava pontos a cada 50m ou 5min
7. Chega no destino → UPDATE status = 'saiu_para_entrega'
8. Realiza entrega:
   - Coleta assinatura
   - Tira foto
   - Registra recebedor
9. Finaliza → UPDATE status = 'entregue'
10. Registra prova de entrega
```

### Fluxo 4: Comunicação via Chat

```
1. Motorista precisa falar com embarcador
2. Acessa chat da entrega
3. Sistema verifica se chat existe
4. Se não: Edge Function create-chat-for-entrega
   - Cria chat
   - Adiciona participantes (emb + transp + motorista)
5. Motorista envia mensagem → INSERT em mensagens
6. Trigger: notify_new_message
   - Cria notificação para outros participantes
7. Realtime: participantes veem mensagem instantaneamente
8. Frontend mostra toast de nova mensagem
```

### Fluxo 5: Convite de Novo Usuário

```
1. Admin da empresa acessa → Usuários da Empresa
2. Clica "Convidar Usuário"
3. Preenche: email, cargo, filial
4. Envia → Edge Function: invite-user
   - Valida permissão (é ADMIN?)
   - Cria company_invites
   - Envia email via Supabase Auth
5. Usuário recebe email com link
6. Clica no link → /login?invite=TOKEN
7. Cria conta ou faz login
8. Sistema detecta token → Edge Function: accept-invite
   - Cria usuarios se necessário
   - Vincula a usuarios_filiais
   - Adiciona user_roles
9. Usuário tem acesso ao portal
```

### Fluxo 6: Cadastro de Motorista

```
1. Gestão de frota → /transportadora/motoristas
2. Clica "Novo Motorista"
3. Wizard multi-step:
   - Dados pessoais (CPF, nome, telefone)
   - Credenciais (email, senha)
   - Veículo (placa, tipo, capacidade)
   - Ajudante (opcional)
4. Envia → Edge Function: create-driver-auth
   - Cria auth.user
   - Cria usuarios
   - Adiciona roles
   - Cria motoristas
   - Cria veiculos
   - Cria ajudantes (se houver)
5. Trigger: notify_motorista_added
   - Notifica gestores da transportadora
6. Motorista pode fazer login
```

---

## Apêndice: Buckets de Storage

| Bucket | Público | Uso |
|--------|---------|-----|
| `notas-fiscais` | ❌ | Notas fiscais das cargas |
| `fotos-frota` | ✅ | Fotos de veículos e carrocerias |
| `chat-anexos` | ✅ | Arquivos enviados no chat |

---

## Apêndice: Enums do Sistema

```sql
-- Status de carga
status_carga: rascunho | publicada | parcialmente_alocada | 
              totalmente_alocada | finalizada | cancelada

-- Status de entrega
status_entrega: aguardando | saiu_para_coleta | saiu_para_entrega |
                entregue | problema | cancelada

-- Tipo de empresa
tipo_empresa: EMBARCADOR | TRANSPORTADORA

-- Cargo de usuário
usuario_cargo: ADMIN | OPERADOR

-- Role de admin
admin_role: super_admin | admin | suporte

-- Tipo de cadastro motorista
tipo_cadastro_motorista: frota | autonomo

-- Tipo de notificação
tipo_notificacao: status_entrega_alterado | cte_anexado | 
                  nova_mensagem | motorista_adicionado | nova_carga
```

---

*Documento gerado automaticamente - HubFrete Platform*
