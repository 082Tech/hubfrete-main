
-- Financial records per delivery (auto-created when entrega status = 'entregue')
CREATE TABLE public.financeiro_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES public.entregas(id) ON DELETE CASCADE,
  empresa_transportadora_id INTEGER REFERENCES public.empresas(id),
  empresa_embarcadora_id INTEGER REFERENCES public.empresas(id),
  valor_frete NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_comissao NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_liquido NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_vencimento DATE,
  data_pagamento DATE,
  metodo_pagamento TEXT,
  comprovante_url TEXT,
  observacoes TEXT,
  baixa_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entrega_id)
);

COMMENT ON TABLE public.financeiro_entregas IS 'Financial records per delivery - tracks payments between shippers, HubFrete, and carriers';

ALTER TABLE public.financeiro_entregas ENABLE ROW LEVEL SECURITY;

-- RLS: Admins full access
CREATE POLICY "Admins full access financeiro" ON public.financeiro_entregas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS: Transportadora reads own records
CREATE POLICY "Transportadora read own financeiro" ON public.financeiro_entregas
  FOR SELECT TO authenticated
  USING (
    empresa_transportadora_id IN (
      SELECT f.empresa_id FROM usuarios u
      JOIN usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN filiais f ON f.id = uf.filial_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- RLS: Embarcadora reads own records
CREATE POLICY "Embarcadora read own financeiro" ON public.financeiro_entregas
  FOR SELECT TO authenticated
  USING (
    empresa_embarcadora_id IN (
      SELECT f.empresa_id FROM usuarios u
      JOIN usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN filiais f ON f.id = uf.filial_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Trigger: auto-create financial record when entrega is delivered
CREATE OR REPLACE FUNCTION public.criar_financeiro_entrega()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_embarcador_empresa_id INTEGER;
  v_transportadora_empresa_id INTEGER;
  v_comissao_percent NUMERIC;
  v_valor_frete NUMERIC;
  v_valor_comissao NUMERIC;
  v_valor_liquido NUMERIC;
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status != 'entregue') THEN
    IF EXISTS (SELECT 1 FROM financeiro_entregas WHERE entrega_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT c.empresa_id INTO v_embarcador_empresa_id FROM cargas c WHERE c.id = NEW.carga_id;
    SELECT m.empresa_id INTO v_transportadora_empresa_id FROM motoristas m WHERE m.id = NEW.motorista_id;

    SELECT COALESCE(e.comissao_hubfrete_percent, 0) INTO v_comissao_percent
    FROM empresas e WHERE e.id = v_embarcador_empresa_id;

    v_valor_frete := COALESCE(NEW.valor_frete, 0);
    v_valor_comissao := ROUND(v_valor_frete * v_comissao_percent / 100, 2);
    v_valor_liquido := v_valor_frete - v_valor_comissao;

    INSERT INTO financeiro_entregas (
      entrega_id, empresa_transportadora_id, empresa_embarcadora_id,
      valor_frete, valor_comissao, valor_liquido
    ) VALUES (
      NEW.id, v_transportadora_empresa_id, v_embarcador_empresa_id,
      v_valor_frete, v_valor_comissao, v_valor_liquido
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_criar_financeiro_entrega
  AFTER UPDATE ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_financeiro_entrega();

-- Updated_at trigger
CREATE TRIGGER trg_financeiro_entregas_updated_at
  BEFORE UPDATE ON public.financeiro_entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-financeiro', 'comprovantes-financeiro', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin upload comprovantes financeiro" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'comprovantes-financeiro'
    AND public.is_admin(auth.uid())
  );

CREATE POLICY "Read comprovantes financeiro" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes-financeiro');

-- Bank details column for carrier payment config
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS dados_bancarios JSONB DEFAULT NULL;

COMMENT ON COLUMN public.empresas.dados_bancarios IS 'Bank account details for financial settlements (PIX key, bank, agency, account)';
