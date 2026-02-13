

# Plano: Campos Fiscais Faltantes para CT-e e MDF-e

## Contexto

A API Focus NFe exige campos fiscais obrigatorios que nao existem no banco de dados atual. Sem eles, o payload do CT-e sera rejeitado pela SEFAZ. Este plano adiciona todos os campos necessarios e cria formularios para preenchimento.

## Gaps Identificados vs API Focus NFe

### O que temos vs o que falta

```text
CAMPO FOCUS NFE               | TEMOS?  | ONDE FALTA
-------------------------------|---------|----------------------------------
cnpj_emitente                  | SIM     | empresas.cnpj_matriz
inscricao_estadual_emitente    | NAO     | empresas (nao existe coluna)
nome_emitente / razao_social   | PARCIAL | empresas.nome (informal)
logradouro_emitente            | NAO     | filiais.endereco (campo unico, nao estruturado)
numero_emitente                | NAO     | filiais (nao existe)
bairro_emitente                | NAO     | filiais (nao existe)
codigo_municipio_emitente      | NAO     | filiais (nao existe - IBGE 7 digitos)
municipio_emitente             | SIM     | filiais.cidade
uf_emitente                    | SIM     | filiais.estado
cep_emitente                   | SIM     | filiais.cep
telefone_emitente              | SIM     | filiais.telefone
codigo_municipio_remetente     | NAO     | enderecos_carga (nao existe)
codigo_municipio_destinatario  | NAO     | enderecos_carga (nao existe)
inscricao_estadual_destinatario| NAO     | cargas (nao existe)
cfop                           | NAO     | nenhuma tabela
natureza_operacao              | NAO     | nenhuma tabela
numero (CT-e)                  | NAO     | nenhum controle de numeracao
serie (CT-e)                   | NAO     | nenhum controle de numeracao
icms_situacao_tributaria       | NAO     | nenhuma tabela
icms_base_calculo              | NAO     | nenhuma tabela
icms_aliquota                  | NAO     | nenhuma tabela
valor_total_carga              | PARCIAL | cargas.valor_mercadoria (pode ser null)
quantidades (peso bruto)       | SIM     | cargas.peso_kg
tipo_servico                   | NAO     | nenhuma tabela
tomador                        | NAO     | nenhuma tabela
```

## Mudancas no Banco de Dados (3 migrations)

### Migration 1: Campos fiscais na tabela `empresas`

```sql
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;
```

### Migration 2: Endereco estruturado + codigo IBGE na tabela `filiais`

```sql
ALTER TABLE public.filiais
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS codigo_municipio_ibge TEXT;
```

A coluna `endereco` existente sera mantida para compatibilidade, mas os novos campos estruturados serao usados para gerar o payload fiscal.

### Migration 3: Codigo IBGE nos enderecos de carga + IE destinatario + xml_content nas NF-es

```sql
ALTER TABLE public.enderecos_carga
  ADD COLUMN IF NOT EXISTS codigo_municipio_ibge TEXT;

ALTER TABLE public.cargas
  ADD COLUMN IF NOT EXISTS destinatario_inscricao_estadual TEXT,
  ADD COLUMN IF NOT EXISTS remetente_inscricao_estadual TEXT;

ALTER TABLE public.nfes
  ADD COLUMN IF NOT EXISTS xml_content TEXT;
```

### Migration 4: Tabela de configuracao fiscal por empresa

```sql
CREATE TABLE IF NOT EXISTS public.config_fiscal (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES public.empresas(id),
  cfop_estadual TEXT NOT NULL DEFAULT '5353',
  cfop_interestadual TEXT NOT NULL DEFAULT '6353',
  natureza_operacao TEXT NOT NULL DEFAULT 'PRESTACAO DE SERVICO DE TRANSPORTE',
  serie_cte INTEGER NOT NULL DEFAULT 1,
  proximo_numero_cte INTEGER NOT NULL DEFAULT 1,
  icms_situacao_tributaria TEXT NOT NULL DEFAULT '00',
  icms_aliquota NUMERIC(5,2) DEFAULT 0,
  tomador_padrao TEXT NOT NULL DEFAULT '0',
  tipo_servico INTEGER NOT NULL DEFAULT 0,
  ambiente INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.config_fiscal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios da empresa podem ler config fiscal"
  ON public.config_fiscal FOR SELECT
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "Usuarios da empresa podem inserir config fiscal"
  ON public.config_fiscal FOR INSERT
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "Usuarios da empresa podem atualizar config fiscal"
  ON public.config_fiscal FOR UPDATE
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));
```

### Migration 5: Tabelas de documentos fiscais (ctes, nfes, manifestos)

Verificar se ja existem no banco. Na analise atual, **nao existem**. Sera necessario criar:

```sql
CREATE TABLE IF NOT EXISTS public.ctes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID REFERENCES public.entregas(id),
  numero TEXT,
  serie TEXT,
  chave_acesso TEXT,
  url TEXT,
  xml_url TEXT,
  valor NUMERIC(12,2),
  focus_ref TEXT,
  focus_status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nfes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID REFERENCES public.entregas(id),
  cte_id UUID REFERENCES public.ctes(id),
  numero TEXT,
  chave_acesso TEXT,
  url TEXT,
  xml_content TEXT,
  valor NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manifestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID REFERENCES public.viagens(id),
  numero TEXT,
  chave_acesso TEXT,
  url TEXT,
  xml_url TEXT,
  focus_ref TEXT,
  focus_status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manifesto_ctes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifesto_id UUID REFERENCES public.manifestos(id),
  cte_id UUID REFERENCES public.ctes(id),
  UNIQUE(manifesto_id, cte_id)
);

-- RLS para todas
ALTER TABLE public.ctes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifesto_ctes ENABLE ROW LEVEL SECURITY;
```

## Mudancas no Frontend

### 1. Formulario de Configuracao Fiscal (nova aba em Configuracoes)

**Arquivo: `src/pages/portals/transportadora/Configuracoes.tsx`**

Adicionar uma nova aba "Fiscal" no array de tabs com os seguintes campos editaveis:

- Inscricao Estadual (IE) da empresa
- Razao Social formal
- CFOP Estadual / Interestadual
- Natureza da Operacao
- Serie do CT-e
- Proximo Numero CT-e
- ICMS: Situacao Tributaria, Aliquota
- Tomador padrao (0=remetente, 1=expedidor, 2=recebedor, 3=destinatario)
- Tipo de servico (0=normal, 1=subcontratacao, 2=redespacho, 3=redespacho intermediario, 4=servico vinculado multimodal)
- Ambiente (1=producao, 2=homologacao)

Tambem adicionar campos de endereco estruturado da filial matriz (logradouro, numero, bairro, codigo IBGE).

### 2. Lookup de codigo IBGE de municipios

**Novo arquivo: `src/lib/ibgeLookup.ts`**

Funcao que consulta a API do IBGE (`https://servicodados.ibge.gov.br/api/v1/localidades/municipios`) para buscar o codigo de 7 digitos a partir do nome da cidade + UF. Sera usada:
- No formulario de configuracao fiscal (auto-preencher codigo IBGE da filial)
- No cadastro de enderecos de carga (auto-preencher ao informar cidade/estado)

### 3. Atualizar Edge Function `focusnfe-cte`

**Arquivo: `supabase/functions/focusnfe-cte/index.ts`**

Na acao `emitir_com_nfes`, atualizar o `buildCteFromEntrega` para:
- Buscar `config_fiscal` da empresa da transportadora
- Usar `cfop`, `natureza_operacao`, `serie`, `numero`, `icms_*` reais
- Usar endereco estruturado da filial (logradouro, numero, bairro, codigo IBGE)
- Usar `inscricao_estadual` da empresa
- Usar `razao_social` da empresa (em producao; em homologacao manter mensagem padrao)
- Incrementar `proximo_numero_cte` na tabela `config_fiscal` apos emissao
- Incluir `codigo_municipio_*` nos enderecos de remetente/destinatario

### 4. Atualizar formularios de carga (embarcador)

**Arquivo: `src/components/cargas/DestinoSection.tsx`** e **`src/components/cargas/RemetenteSection.tsx`**

Adicionar campo opcional "Inscricao Estadual" para destinatario e remetente.

### 5. Auto-preencher codigo IBGE nos enderecos

**Arquivo: `src/components/cargas/OrigemSection.tsx`** e **`DestinoSection.tsx`**

Ao salvar um endereco de carga, buscar automaticamente o codigo IBGE do municipio e salvar no campo `codigo_municipio_ibge`.

## Detalhes Tecnicos

### API IBGE para codigos municipais

```text
GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios
```

Retorna lista com `id` (codigo IBGE 7 digitos) e `nome` do municipio. A funcao fara match por nome normalizado (sem acentos, uppercase).

### Controle de numeracao CT-e

A tabela `config_fiscal` armazena `proximo_numero_cte`. A Edge Function faz:
1. `SELECT proximo_numero_cte FROM config_fiscal WHERE empresa_id = X FOR UPDATE`
2. Usa o numero no payload
3. `UPDATE config_fiscal SET proximo_numero_cte = proximo_numero_cte + 1`

Isso garante numeracao sequencial sem duplicatas (lock via `FOR UPDATE`).

### Campos obrigatorios Focus NFe que serao preenchidos

Apos as mudancas, o payload completo tera:

- `cnpj_emitente` -- empresas.cnpj_matriz
- `inscricao_estadual_emitente` -- empresas.inscricao_estadual
- `nome_emitente` -- empresas.razao_social (ou msg homologacao)
- `logradouro/numero/bairro/municipio/uf/cep_emitente` -- filiais (estruturado)
- `codigo_municipio_emitente` -- filiais.codigo_municipio_ibge
- `cfop` -- config_fiscal.cfop_estadual ou cfop_interestadual
- `natureza_operacao` -- config_fiscal
- `numero` -- config_fiscal.proximo_numero_cte
- `serie` -- config_fiscal.serie_cte
- `icms_*` -- config_fiscal
- `tomador` -- config_fiscal.tomador_padrao
- `tipo_servico` -- config_fiscal.tipo_servico
- `codigo_municipio_remetente/destinatario` -- enderecos_carga.codigo_municipio_ibge
- `inscricao_estadual_destinatario` -- cargas.destinatario_inscricao_estadual

## Ordem de Implementacao

1. Migrations SQL (5 migrations executadas no Supabase)
2. `src/lib/ibgeLookup.ts` -- helper de lookup IBGE
3. `src/pages/portals/transportadora/Configuracoes.tsx` -- aba Fiscal
4. `src/components/cargas/DestinoSection.tsx` + `RemetenteSection.tsx` -- campo IE
5. `supabase/functions/focusnfe-cte/index.ts` -- payload completo
6. Atualizar types do Supabase

