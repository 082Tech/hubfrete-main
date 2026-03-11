
-- PART 1: Add columns, create tables (skip faturas type conversion for now)

-- Add missing columns
ALTER TABLE public.faturas ADD COLUMN IF NOT EXISTS baixa_por uuid;
ALTER TABLE public.financeiro_entregas ADD COLUMN IF NOT EXISTS data_vencimento date;
ALTER TABLE public.financeiro_entregas ADD COLUMN IF NOT EXISTS baixa_por uuid;

-- Create tables
CREATE TABLE IF NOT EXISTS public.certificados_digitais (
  empresa_id bigint PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  nome_titular text, cnpj_titular varchar(14), data_validade date,
  pfx_base64 text NOT NULL, senha_encriptada text NOT NULL
);
ALTER TABLE public.certificados_digitais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa admin certificado" ON public.certificados_digitais FOR ALL TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE TABLE IF NOT EXISTS public.gnres (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  empresa_id bigint NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cargas_id uuid REFERENCES public.cargas(id) ON DELETE SET NULL,
  nfe_id uuid REFERENCES public.nfes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','processando','autorizada','rejeitada')),
  uf_favorecida varchar(2) NOT NULL, receita varchar(10) NOT NULL, valor numeric(10,2) NOT NULL,
  data_vencimento date NOT NULL, numero_recibo varchar(50), codigo_barras varchar(100),
  linha_digitavel varchar(100), xml_envio text, xml_retorno text, motivo_rejeicao text
);
ALTER TABLE public.gnres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa gnres" ON public.gnres FOR ALL TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id)) WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));
CREATE POLICY "Admin gnres" ON public.gnres FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.mdfe_documentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mdfe_id uuid NOT NULL REFERENCES public.mdfes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('cte','nfe')), chave_acesso text NOT NULL,
  cte_id uuid REFERENCES public.ctes(id) ON DELETE SET NULL,
  nfe_id uuid REFERENCES public.nfes(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_doc_ref CHECK ((tipo='cte' AND cte_id IS NOT NULL AND nfe_id IS NULL) OR (tipo='nfe' AND nfe_id IS NOT NULL AND cte_id IS NULL))
);
ALTER TABLE public.mdfe_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin mdfe_docs" ON public.mdfe_documentos FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.manifesto_ctes (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, manifesto_id uuid, cte_id uuid);
CREATE TABLE IF NOT EXISTS public.manifestos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY, viagem_id uuid REFERENCES public.viagens(id),
  empresa_id bigint REFERENCES public.empresas(id), numero text, chave_acesso text, url text, xml_url text,
  focus_ref text, focus_status text DEFAULT 'pendente', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
