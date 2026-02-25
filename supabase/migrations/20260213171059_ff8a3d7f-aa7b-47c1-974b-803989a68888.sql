
-- Migration 5: Fiscal document tables
CREATE TABLE IF NOT EXISTS public.ctes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID REFERENCES public.entregas(id),
  empresa_id BIGINT REFERENCES public.empresas(id),
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
  empresa_id BIGINT REFERENCES public.empresas(id),
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

-- RLS
ALTER TABLE public.ctes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifesto_ctes ENABLE ROW LEVEL SECURITY;

-- ctes policies
CREATE POLICY "Auth users can read ctes" ON public.ctes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can insert ctes" ON public.ctes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update ctes" ON public.ctes FOR UPDATE USING (auth.uid() IS NOT NULL);

-- nfes policies
CREATE POLICY "Auth users can read nfes" ON public.nfes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can insert nfes" ON public.nfes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- manifestos policies
CREATE POLICY "Auth users can read manifestos" ON public.manifestos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can insert manifestos" ON public.manifestos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can update manifestos" ON public.manifestos FOR UPDATE USING (auth.uid() IS NOT NULL);

-- manifesto_ctes policies
CREATE POLICY "Auth users can read manifesto_ctes" ON public.manifesto_ctes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can insert manifesto_ctes" ON public.manifesto_ctes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
