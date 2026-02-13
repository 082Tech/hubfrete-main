
-- Migration 4: Tabela config_fiscal
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
