

# Plano: Completar Schema Fiscal para API Focus NFe

## Resumo

Adicionar as 2 colunas faltantes na tabela `config_fiscal` para que o banco de dados tenha 100% dos dados necessarios para emissao de CT-e e MDF-e via API Focus NFe.

## Situacao Atual

Apos analise cruzada entre a documentacao da API Focus NFe e o banco de dados, confirmamos que **98% dos dados ja existem**. Apenas 2 campos estao ausentes na tabela `config_fiscal`.

## Alteracoes Necessarias

### Migracao Unica

Adicionar duas colunas a tabela `config_fiscal`:

| Coluna | Tipo | Default | Finalidade |
|--------|------|---------|------------|
| `regime_tributario_emitente` | `INTEGER` | `3` (Regime Normal) | Campo obrigatorio da API. Define se a empresa opera no Simples Nacional (1) ou Regime Normal (3). |
| `icms_base_calculo_percentual` | `NUMERIC(5,2)` | `100.00` | Percentual da base de calculo do ICMS sobre o valor do frete. Necessario para montar o bloco de impostos do CT-e. |

### Atualizacao do Frontend

Atualizar o componente `ConfigFiscalTab.tsx` para incluir os dois novos campos:
- Dropdown para selecionar o regime tributario (Simples Nacional / Regime Normal)
- Campo numerico para o percentual da base de calculo do ICMS

### Atualizacao dos Tipos TypeScript

Atualizar `src/integrations/supabase/types.ts` para refletir as novas colunas.

---

## Secao Tecnica

### SQL da Migracao

```sql
ALTER TABLE public.config_fiscal
  ADD COLUMN IF NOT EXISTS regime_tributario_emitente INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS icms_base_calculo_percentual NUMERIC(5,2) NOT NULL DEFAULT 100.00;

COMMENT ON COLUMN public.config_fiscal.regime_tributario_emitente
  IS '1 = Simples Nacional, 3 = Regime Normal';
COMMENT ON COLUMN public.config_fiscal.icms_base_calculo_percentual
  IS 'Percentual da base de calculo do ICMS (ex: 100.00 = base integral)';
```

### Mapeamento Completo: Banco -> Payload API

Com essas 2 colunas adicionadas, o mapeamento fica completo:

**Emitente**: `empresas` + `filiais` (matriz) + `config_fiscal`
- CNPJ: `empresas.cnpj_matriz`
- IE: `empresas.inscricao_estadual`
- Razao Social: `empresas.razao_social`
- Endereco: `filiais.logradouro`, `numero`, `bairro`, `cep`
- Municipio IBGE: `filiais.codigo_municipio_ibge`
- UF: `filiais.estado`
- Regime Tributario: `config_fiscal.regime_tributario_emitente` (NOVO)

**Fiscal**: `config_fiscal`
- CFOP: `cfop_estadual` ou `cfop_interestadual` (logica por UF)
- Natureza: `natureza_operacao`
- Serie/Numero: `serie_cte` / `proximo_numero_cte`
- ICMS: `icms_situacao_tributaria`, `icms_aliquota`, `icms_base_calculo_percentual` (NOVO)
- Ambiente: `ambiente`

**Remetente/Destinatario**: `cargas` + `enderecos_carga`
**Veiculo**: `veiculos.placa`, `veiculos.uf`, `veiculos.antt_rntrc`
**Motorista**: `motoristas.cpf`, `motoristas.nome_completo`

### Campos Derivados por Logica (sem banco)
- `data_emissao`: gerado no momento da emissao
- `tipo_documento`: sempre `0` (Normal)
- `modal`: sempre `01` (Rodoviario)
- `indicador_inscricao_estadual_tomador`: derivado da IE do tomador

### Sequencia de Implementacao

1. Aplicar migracao SQL (1 migration)
2. Atualizar types.ts
3. Atualizar ConfigFiscalTab.tsx com os 2 novos campos

