
# Automacao de Documentos Fiscais + Bloqueio por NF-e

## Resumo

O embarcador anexa a NF-e (XML) na entrega. Enquanto nao tiver NF-e anexada, a transportadora nao consegue mudar o status de `saiu_para_coleta` para `saiu_para_entrega`. Quando a transportadora avanca para `saiu_para_entrega`, o sistema automaticamente emite o CT-e via Focus NFe usando os dados da entrega + NF-e anexada.

## Fluxo Operacional

```text
1. Embarcador publica carga
2. Transportadora cria entrega/viagem
3. Status: aguardando -> saiu_para_coleta (livre)
4. Embarcador anexa NF-e (XML obrigatorio - conteudo salvo no DB)
5. Status: saiu_para_coleta -> saiu_para_entrega (BLOQUEADO ate ter NF-e)
   -> Ao desbloquear: sistema emite CT-e automaticamente via Focus NFe
6. Status: saiu_para_entrega -> entregue (precisa canhoto)
```

## Mudancas Planejadas

### 1. Tabela `nfes` - Guardar XML no DB

Sera necessario rodar SQL para adicionar uma coluna `xml_content TEXT` na tabela `nfes` para armazenar o conteudo do XML diretamente no banco (sem depender de arquivo no storage). SQL para rodar manualmente:

```sql
ALTER TABLE public.nfes ADD COLUMN IF NOT EXISTS xml_content TEXT;
```

### 2. Portal do Embarcador - Upload de NF-e (XML)

**Arquivo: `src/pages/portals/embarcador/GestaoCargas.tsx`**

- Adicionar botao "Anexar NF-e" na secao de documentos do painel de detalhes (atualmente mostra `hasDoc: false` hardcoded)
- O botao abre um input de arquivo que aceita apenas `.xml`
- Ao selecionar o XML:
  - Le o conteudo do arquivo como texto
  - Faz upload do arquivo para o storage (para referencia/download)
  - Insere na tabela `nfes` com `entrega_id`, `url` (storage path) e `xml_content` (conteudo do XML)
  - Extrai a chave de acesso do XML se possivel (tag `<chNFe>`)
- Mostrar indicador visual de NF-e pendente (alerta ambar) quando nao tiver NF-e anexada
- Atualizar o contador de documentos para refletir NF-es da tabela

### 3. Bloqueio de Transicao `saiu_para_coleta -> saiu_para_entrega`

**Arquivo: `src/pages/portals/transportadora/OperacaoDiaria.tsx`**

No `DetailPanel`, antes de permitir a transicao para `saiu_para_entrega`:
- Consultar tabela `nfes` para verificar se existe pelo menos 1 NF-e vinculada a entrega (via CT-e existente ou diretamente)
- Se nao houver NF-e: exibir alerta ambar "NF-e obrigatoria - Aguardando embarcador anexar a Nota Fiscal" e desabilitar o botao
- Se houver NF-e: liberar o botao normalmente

Ajustar o `handleActionClick` e o dialog de confirmacao para incluir essa verificacao.

### 4. Emissao Automatica de CT-e ao Sair para Entrega

**Arquivo: `src/pages/portals/transportadora/OperacaoDiaria.tsx`**

Na `statusMutation`, quando `newStatus === 'saiu_para_entrega'`:

1. Buscar dados da entrega (remetente, destinatario, enderecos, valores, NF-es)
2. Montar o payload do CT-e conforme a API Focus NFe (modal rodoviario)
3. Gerar uma referencia unica (`ref`) baseada no ID da entrega
4. Chamar a Edge Function `focusnfe-cte` com `action: 'emitir'`
5. O CT-e sera salvo na tabela `ctes` com `focus_ref` e `focus_status: 'processando_autorizacao'`
6. Vincular as NF-es existentes ao CT-e recem criado
7. Exibir toast informando que o CT-e esta sendo processado

### 5. Consulta de Status do CT-e (Polling)

**Arquivo: `src/lib/documentHelpers.ts`**

Adicionar funcao `pollCteStatus(focusRef: string)` que:
- Chama a Edge Function com `action: 'consultar'`
- A Edge Function ja atualiza o banco automaticamente quando autorizado
- Retorna o status atual

No `DetailPanel` da transportadora, quando houver CT-e com `focus_status !== 'autorizado'`:
- Mostrar badge "Processando..." com botao para consultar manualmente
- Atualizar a UI quando o status mudar para autorizado (mostrando numero e link do DACTE)

### 6. Ajuste na Edge Function

**Arquivo: `supabase/functions/focusnfe-cte/index.ts`**

- Adicionar acao `emitir_com_nfes` que:
  - Recebe `entrega_id`
  - Busca as NF-es da entrega no banco
  - Monta o payload do CT-e com as chaves das NF-es
  - Emite via Focus NFe
  - Salva o CT-e e vincula as NF-es

Isso centraliza a logica de montagem do payload na Edge Function em vez de no frontend.

### 7. Atualizacao do `AnexarDocumentosDialog`

**Arquivo: `src/components/entregas/AnexarDocumentosDialog.tsx`**

- Mostrar NF-es vindas da tabela com indicacao de quem anexou (embarcador)
- CT-es gerados automaticamente mostram badge "Auto" com status Focus NFe
- Manter upload manual de CT-e como fallback

## Detalhes Tecnicos

### Payload CT-e para Focus NFe (modal rodoviario - homologacao)

O payload sera montado a partir dos dados da entrega:
- `cnpj_emitente`: CNPJ da transportadora (do cadastro da empresa)
- `cpf/cnpj_remetente`: dados do remetente da carga
- `cnpj_destinatario`: dados do destinatario
- Enderecos de origem/destino
- `valor_total`: valor do frete
- `nfes[]`: array com chaves de acesso das NF-es extraidas do XML
- `modal_rodoviario`: dados do veiculo/motorista

Em homologacao, os nomes devem ser "CT-E EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL".

### Referencia unica

Formato: `cte-{entrega_id_curto}-{timestamp}` para garantir unicidade.

## Ordem de Implementacao

1. SQL: adicionar `xml_content` na tabela `nfes`
2. Embarcador: upload de NF-e com XML
3. Transportadora: bloqueio de transicao sem NF-e
4. Edge Function: acao `emitir_com_nfes`
5. Transportadora: emissao automatica ao sair para entrega
6. Polling de status do CT-e
7. Atualizacao visual dos documentos em ambos portais
