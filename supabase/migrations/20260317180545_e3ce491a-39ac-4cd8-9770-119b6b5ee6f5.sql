-- Bloco 3.1: Tabela de configuração financeira por embarcador
CREATE TABLE IF NOT EXISTS public.empresa_config_financeira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id integer REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tipo_pagamento text NOT NULL DEFAULT 'pos_pago',
  prazo_dias integer NOT NULL DEFAULT 30,
  dia_fixo integer,
  ciclo_faturamento text DEFAULT 'mensal',
  antecipacao_permitida boolean NOT NULL DEFAULT false,
  taxa_antecipacao_percent numeric NOT NULL DEFAULT 2.0,
  limite_credito numeric NOT NULL DEFAULT 0,
  credito_utilizado numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_config_financeira ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage empresa_config_financeira"
  ON public.empresa_config_financeira
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Empresa users can view own config"
  ON public.empresa_config_financeira
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TRIGGER update_empresa_config_financeira_updated_at
  BEFORE UPDATE ON public.empresa_config_financeira
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.empresa_config_financeira 
  IS 'Configuração financeira por embarcador: tipo de pagamento, prazo, antecipação, limite de crédito';

-- Bloco 3.2: Novas colunas em financeiro_entregas
ALTER TABLE public.financeiro_entregas
  ADD COLUMN IF NOT EXISTS antecipado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_antecipacao timestamptz,
  ADD COLUMN IF NOT EXISTS taxa_antecipacao_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dias_antecipados integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_taxa_antecipacao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motorista_id uuid REFERENCES public.motoristas(id),
  ADD COLUMN IF NOT EXISTS tipo_beneficiario text DEFAULT 'transportadora';

-- Bloco 3.3: Coluna calculada valor_final
ALTER TABLE public.financeiro_entregas
  ADD COLUMN IF NOT EXISTS valor_final numeric GENERATED ALWAYS AS (valor_liquido - COALESCE(valor_taxa_antecipacao, 0)) STORED;

COMMENT ON COLUMN public.financeiro_entregas.antecipado IS 'Se o recebível foi antecipado';
COMMENT ON COLUMN public.financeiro_entregas.data_vencimento IS 'D+30 a partir da finalização da entrega';
COMMENT ON COLUMN public.financeiro_entregas.tipo_beneficiario IS 'transportadora ou autonomo';