
-- =====================================================
-- 1. Tabela: empresa_config_financeira
-- Configuração de pagamento por embarcador
-- =====================================================
CREATE TABLE public.empresa_config_financeira (
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
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Empresa users can view own config"
  ON public.empresa_config_financeira
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- =====================================================
-- 2. Adicionar colunas de antecipação em financeiro_entregas
-- =====================================================
ALTER TABLE public.financeiro_entregas
  ADD COLUMN IF NOT EXISTS antecipado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_antecipacao timestamptz,
  ADD COLUMN IF NOT EXISTS taxa_antecipacao_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dias_antecipados integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_taxa_antecipacao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_final numeric GENERATED ALWAYS AS (valor_liquido - COALESCE(valor_taxa_antecipacao, 0)) STORED,
  ADD COLUMN IF NOT EXISTS motorista_id uuid REFERENCES public.motoristas(id),
  ADD COLUMN IF NOT EXISTS tipo_beneficiario text DEFAULT 'transportadora';

-- =====================================================
-- 3. Atualizar trigger criar_financeiro_entrega para setar D+30
-- =====================================================
CREATE OR REPLACE FUNCTION public.criar_financeiro_entrega()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_embarcador_empresa_id INTEGER;
  v_transportadora_empresa_id INTEGER;
  v_motorista_id UUID;
  v_tipo_cadastro TEXT;
  v_comissao_percent NUMERIC;
  v_valor_frete NUMERIC;
  v_valor_comissao NUMERIC;
  v_valor_liquido NUMERIC;
  v_data_vencimento TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status != 'entregue') THEN
    IF EXISTS (SELECT 1 FROM financeiro_entregas WHERE entrega_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT c.empresa_id INTO v_embarcador_empresa_id FROM cargas c WHERE c.id = NEW.carga_id;
    SELECT m.empresa_id, m.id, m.tipo_cadastro::text
      INTO v_transportadora_empresa_id, v_motorista_id, v_tipo_cadastro
      FROM motoristas m WHERE m.id = NEW.motorista_id;

    SELECT COALESCE(e.comissao_hubfrete_percent, 0) INTO v_comissao_percent
    FROM empresas e WHERE e.id = v_embarcador_empresa_id;

    v_valor_frete := COALESCE(NEW.valor_frete, 0);
    v_valor_comissao := ROUND(v_valor_frete * v_comissao_percent / 100, 2);
    v_valor_liquido := v_valor_frete - v_valor_comissao;

    -- D+30 a partir da data de entrega
    v_data_vencimento := COALESCE(NEW.entregue_em, NOW()) + INTERVAL '30 days';

    INSERT INTO financeiro_entregas (
      entrega_id, empresa_transportadora_id, empresa_embarcadora_id,
      valor_frete, valor_comissao, valor_liquido,
      data_vencimento, motorista_id,
      tipo_beneficiario
    ) VALUES (
      NEW.id, v_transportadora_empresa_id, v_embarcador_empresa_id,
      v_valor_frete, v_valor_comissao, v_valor_liquido,
      v_data_vencimento, v_motorista_id,
      CASE WHEN v_tipo_cadastro = 'autonomo' THEN 'autonomo' ELSE 'transportadora' END
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- 4. Trigger de updated_at para empresa_config_financeira
-- =====================================================
CREATE TRIGGER update_empresa_config_financeira_updated_at
  BEFORE UPDATE ON public.empresa_config_financeira
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 5. Comentários nas tabelas
-- =====================================================
COMMENT ON TABLE public.empresa_config_financeira IS 'Configuração financeira por embarcador: tipo de pagamento, prazo, antecipação, limite de crédito';
COMMENT ON COLUMN public.financeiro_entregas.antecipado IS 'Se o recebível foi antecipado';
COMMENT ON COLUMN public.financeiro_entregas.data_vencimento IS 'D+30 a partir da finalização da entrega';
COMMENT ON COLUMN public.financeiro_entregas.tipo_beneficiario IS 'transportadora ou autonomo';
