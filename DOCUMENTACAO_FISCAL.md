# Documentação do Fluxo Fiscal Automatizado - HubFrete

Este documento descreve o funcionamento técnico e operacional do novo fluxo de automação fiscal implementado no projeto HubFrete.

## 1. Visão Geral do Fluxo

O fluxo foi desenhado para ser "zero-touch" para a transportadora, automatizando a validação de documentos e a emissão de obrigações fiscais.

1.  **Upload de NF-e**: O embarcador anexa o XML da nota fiscal à carga.
2.  **Validação SEFAZ**: O sistema valida a nota automaticamente na SEFAZ via FocusNFe.
3.  **Extração de Dados**: Dados como Remetente, Destinatário, Peso e Valor são extraídos do XML oficial.
4.  **Emissão de CT-e**: Assim que uma transportadora aceita a carga, o CT-e é gerado automaticamente.
5.  **Emissão de MDF-e**: Quando a viagem é iniciada, o MDF-e é gerado agrupando os CT-es.

---

## 2. Componentes Técnicos

### 2.1 Banco de Dados (Supabase)
- **Tabela `nfes`**: Armazena as notas fiscais com status de validação (`pendente`, `validando`, `autorizada`, `rejeitada`).
- **Tabela `mdfes`**: Gerencia os Manifestos Eletrônicos.
- **Tabela `mdfe_documentos`**: Tabela de ligação entre MDF-e e seus documentos (CT-e/NF-e).
- **Triggers**:
    - `after_nfe_insert`: Dispara a validação assim que uma nota é inserida.
    - `after_entrega_aceita`: Dispara a geração do CT-e no aceite da carga.
    - `after_viagem_start`: Dispara a geração do MDF-e no início da viagem.

### 2.2 Edge Functions (Deno)
- **`validate-nfe`**: Faz a interface com a API FocusNFe para validar a nota e atualizar o banco.
- **`focusnfe-cte`**: Gerencia a emissão automática de CT-e com base nos dados da carga e NF-e.
- **`focusnfe-mdfe`**: Gerencia a emissão de MDF-e consolidando os dados da viagem.

### 2.3 Frontend (React)
- **`NotaFiscalUpload.tsx`**: Componente de upload atualizado para disparar a validação.
- **`NfeValidationStatus.tsx`**: Novo componente que mostra o status em tempo real da validação da nota.
- **`nfeXmlParser.ts`**: Utilitário de extração de dados do XML.

---

## 3. Configuração Necessária

Para que o fluxo funcione corretamente, as seguintes variáveis de ambiente devem estar configuradas no Supabase:

- `FOCUS_NFE_TOKEN`: Seu token da API FocusNFe.
- `SUPABASE_URL`: URL do seu projeto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço para operações administrativas.

### 3.1 Webhooks (FocusNFe)
Recomenda-se configurar um Webhook no painel da FocusNFe apontando para uma Edge Function de processamento de retorno (a ser implementada conforme necessidade de conciliação).

---

## 4. Tratamento de Erros

- **NF-e Rejeitada**: Se a nota for inválida, o status mudará para `rejeitada` e o erro será exibido no componente `NfeValidationStatus`. O CT-e não será gerado até que uma nota válida seja anexada.
- **Falha no CT-e**: Erros de emissão são registrados na tabela `entregas` (coluna `cte_ultimo_erro`).

---
*Documentação gerada em 13/02/2026.*
