## Guia de Integração para Geração de GNRE via Automação

A geração da Guia Nacional de Recolhimento de Tributos Estaduais (GNRE) de forma automatizada é realizada através de **Webservices** disponibilizados pelo Portal GNRE. Este processo permite que seu sistema envie lotes de guias e receba o retorno para impressão ou pagamento sem intervenção manual.

### 1. Requisitos Prévios

Para utilizar a automação da GNRE, a empresa deve cumprir os seguintes requisitos:
*   **Certificado Digital**: É obrigatório o uso de um certificado digital (e-CNPJ) padrão ICP-Brasil (A1 ou A3) para assinar as mensagens e autenticar a conexão HTTPS.
*   **Solicitação de Uso**: Antes de iniciar, a empresa deve acessar o [Portal GNRE](https://www.gnre.pe.gov.br) e, no menu **Automação**, selecionar **Solicitar Uso do Webservice**. Esta solicitação deve ser feita tanto para o ambiente de **Homologação** quanto para o de **Produção**.

### 2. Fluxo de Operação (Webservice)

O processo de geração é assíncrono e segue estas etapas:

1.  **Envio do Lote (`GnreLoteRecepcao`)**: O sistema envia um arquivo XML contendo uma ou mais guias. O portal valida a estrutura e retorna um **Número de Recibo**.
2.  **Consulta do Resultado (`GnreResultadoLote`)**: Após alguns segundos, o sistema consulta o processamento do lote utilizando o número do recibo.
3.  **Retorno**: O portal retorna o status de cada guia (Processada com Sucesso ou Rejeitada). Se processada, o retorno contém os dados necessários para gerar o código de barras e a representação impressa.

### 3. Endpoints e WSDLs

Os endereços variam conforme o ambiente:

| Ambiente | URL Base |
| :--- | :--- |
| **Produção** | `https://www.gnre.pe.gov.br/gnreWS/services/` |
| **Homologação** | `https://www.testegnre.pe.gov.br/gnreWS/services/` |

**Principais Serviços (WSDLs):**
*   **Recepção de Lote**: `GnreLoteRecepcao.wsdl`
*   **Consulta de Resultado**: `GnreResultadoLote.wsdl`
*   **Consulta de Configuração da UF**: `GnreConfigUF.wsdl` (Útil para saber quais campos são obrigatórios para cada estado e receita).

### 4. Campos Principais do XML de Envio

Para gerar a GNRE a partir da NF-e que analisamos, os campos fundamentais são:

| Campo XML | Origem/Valor Exemplo |
| :--- | :--- |
| `c01_UfFavorecida` | UF de destino (ex: `PB`) |
| `c02_receita` | Código da Receita (ex: `100099` - ICMS Substituição Tributária por Operação) |
| `c03_id_nao_contribuinte` | CNPJ do Destinatário (se não for contribuinte) |
| `c04_doc_origem` | Tipo de documento (ex: `10` - NF-e) |
| `c05_referencia` | Chave da NF-e ou Número da Nota |
| `c06_valor` | Valor do imposto a ser recolhido |
| `c10_dataVencimento` | Data limite para pagamento |
| `c14_inscricaoEstadual` | IE do Emitente (se tiver inscrição de substituto na UF de destino) |

### 5. Recomendações de Implementação

1.  **Consulte a Configuração da UF**: Cada estado (UF) tem regras diferentes para a mesma receita (alguns exigem código de produto, outros detalhamento da receita). Use o serviço `GnreConfigUF` para automatizar essa validação.
2.  **Tratamento de Erros**: Implemente uma lógica para capturar rejeições comuns, como "Data de vencimento inválida" ou "IE do destinatário inválida".
3.  **Impressão**: O portal retorna os dados da guia. Para gerar o PDF, você pode usar bibliotecas de geração de boletos/guias ou serviços de terceiros que já fazem a ponte com o Webservice da GNRE.

### Referências

*   [Portal GNRE - Seção de Automação](https://www.gnre.pe.gov.br/gnre/portal/automacao.jsp)
*   [Manual de Integração do Contribuinte (v2.13)](https://www.gnre.pe.gov.br/gnre/portal/downloads.jsp)
*   [Consulta de Tabelas e Regras por UF](https://www.gnre.pe.gov.br/gnre/portal/consultarTabelas.jsp)
