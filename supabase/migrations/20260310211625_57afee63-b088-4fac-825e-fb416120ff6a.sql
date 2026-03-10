
-- Create faturas table
CREATE TABLE IF NOT EXISTS public.faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id INTEGER NOT NULL REFERENCES public.empresas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('a_receber', 'a_pagar')),
  quinzena SMALLINT NOT NULL,
  mes SMALLINT NOT NULL,
  ano SMALLINT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  valor_bruto NUMERIC(12,2) DEFAULT 0,
  valor_comissao NUMERIC(12,2) DEFAULT 0,
  valor_liquido NUMERIC(12,2) DEFAULT 0,
  qtd_entregas INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberta',
  data_pagamento TIMESTAMPTZ DEFAULT NULL,
  metodo_pagamento TEXT DEFAULT NULL,
  comprovante_url TEXT DEFAULT NULL,
  observacoes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT faturas_empresa_tipo_periodo_unique UNIQUE (empresa_id, tipo, ano, mes, quinzena)
);

ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage faturas" ON public.faturas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own company faturas" ON public.faturas
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- Create financeiro_entregas table
CREATE TABLE IF NOT EXISTS public.financeiro_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES public.entregas(id) ON DELETE CASCADE,
  empresa_transportadora_id INTEGER REFERENCES public.empresas(id),
  empresa_embarcadora_id INTEGER REFERENCES public.empresas(id),
  valor_frete NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_comissao NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_liquido NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_pagamento TIMESTAMPTZ DEFAULT NULL,
  metodo_pagamento TEXT DEFAULT NULL,
  comprovante_url TEXT DEFAULT NULL,
  observacoes TEXT DEFAULT NULL,
  fatura_embarcador_id UUID REFERENCES public.faturas(id),
  fatura_transportadora_id UUID REFERENCES public.faturas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage financeiro" ON public.financeiro_entregas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Transportadoras can view own financeiro" ON public.financeiro_entregas
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_transportadora_id));

CREATE POLICY "Embarcadores can view own financeiro" ON public.financeiro_entregas
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_embarcadora_id));

-- Create storage bucket for comprovantes
INSERT INTO storage.buckets (id, name, public) VALUES ('comprovantes-financeiro', 'comprovantes-financeiro', false) ON CONFLICT DO NOTHING;
