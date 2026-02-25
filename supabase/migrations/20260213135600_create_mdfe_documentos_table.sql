-- Migration: Criar tabela mdfe_documentos
-- Data: 2026-02-13
-- Descrição: Tabela para vincular documentos fiscais (CT-es e NF-es) a um MDF-e

CREATE TABLE IF NOT EXISTS public.mdfe_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mdfe_id UUID NOT NULL REFERENCES public.mdfes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cte', 'nfe')),
  chave_acesso TEXT NOT NULL,
  cte_id UUID REFERENCES public.ctes(id) ON DELETE SET NULL,
  nfe_id UUID REFERENCES public.nfes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mdfe_docs_mdfe ON public.mdfe_documentos(mdfe_id);
CREATE INDEX IF NOT EXISTS idx_mdfe_docs_tipo ON public.mdfe_documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_mdfe_docs_chave ON public.mdfe_documentos(chave_acesso);

-- Constraint: garantir que apenas um dos IDs esteja preenchido
ALTER TABLE public.mdfe_documentos
  ADD CONSTRAINT check_documento_reference 
  CHECK (
    (tipo = 'cte' AND cte_id IS NOT NULL AND nfe_id IS NULL) OR
    (tipo = 'nfe' AND nfe_id IS NOT NULL AND cte_id IS NULL)
  );

-- Comentários explicativos
COMMENT ON TABLE public.mdfe_documentos 
  IS 'Documentos fiscais (CT-es ou NF-es) vinculados a um MDF-e';

COMMENT ON COLUMN public.mdfe_documentos.mdfe_id 
  IS 'Referência ao MDF-e que contém este documento';

COMMENT ON COLUMN public.mdfe_documentos.tipo 
  IS 'Tipo do documento: cte (Conhecimento de Transporte) ou nfe (Nota Fiscal)';

COMMENT ON COLUMN public.mdfe_documentos.chave_acesso 
  IS 'Chave de acesso de 44 dígitos do documento fiscal';

COMMENT ON COLUMN public.mdfe_documentos.cte_id 
  IS 'Referência ao CT-e (se tipo = cte)';

COMMENT ON COLUMN public.mdfe_documentos.nfe_id 
  IS 'Referência à NF-e (se tipo = nfe)';

-- Enable Row Level Security (RLS)
ALTER TABLE public.mdfe_documentos ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver documentos de MDF-es de suas empresas
CREATE POLICY "Users can view mdfe_documentos"
  ON public.mdfe_documentos
  FOR SELECT
  USING (
    mdfe_id IN (
      SELECT id FROM public.mdfes WHERE
        empresa_id IN (SELECT empresa_id FROM public.motoristas WHERE user_id = auth.uid())
        OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
        OR EXISTS (
          SELECT 1 FROM public.viagens v WHERE v.id = viagem_id AND (
            v.motorista_id = public.get_user_motorista_id(auth.uid())
            OR public.user_belongs_to_empresa(auth.uid(), (SELECT empresa_id FROM public.motoristas WHERE id = v.motorista_id))
          )
        )
    )
    OR public.is_admin(auth.uid())
  );

-- Policy: Usuários podem inserir documentos em MDF-es de suas empresas
CREATE POLICY "Users can insert mdfe_documentos"
  ON public.mdfe_documentos
  FOR INSERT
  WITH CHECK (
    mdfe_id IN (
      SELECT id FROM public.mdfes WHERE
        empresa_id IN (SELECT empresa_id FROM public.motoristas WHERE user_id = auth.uid())
        OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
        OR EXISTS (
          SELECT 1 FROM public.viagens v WHERE v.id = viagem_id AND (
            v.motorista_id = public.get_user_motorista_id(auth.uid())
            OR public.user_belongs_to_empresa(auth.uid(), (SELECT empresa_id FROM public.motoristas WHERE id = v.motorista_id))
          )
        )
    )
    OR public.is_admin(auth.uid())
  );

-- Policy: Usuários podem atualizar documentos de MDF-es de suas empresas
CREATE POLICY "Users can update mdfe_documentos"
  ON public.mdfe_documentos
  FOR UPDATE
  USING (
    mdfe_id IN (
      SELECT id FROM public.mdfes WHERE
        empresa_id IN (SELECT empresa_id FROM public.motoristas WHERE user_id = auth.uid())
        OR public.user_belongs_to_empresa(auth.uid(), empresa_id)
        OR EXISTS (
          SELECT 1 FROM public.viagens v WHERE v.id = viagem_id AND (
            v.motorista_id = public.get_user_motorista_id(auth.uid())
            OR public.user_belongs_to_empresa(auth.uid(), (SELECT empresa_id FROM public.motoristas WHERE id = v.motorista_id))
          )
        )
    )
    OR public.is_admin(auth.uid())
  );

-- Policy: Service role pode fazer tudo
CREATE POLICY "Service role can do everything on mdfe_documentos"
  ON public.mdfe_documentos
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
