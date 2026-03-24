
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.solicitacoes_antecipacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financeiro_entrega_id uuid NOT NULL REFERENCES public.financeiro_entregas(id) ON DELETE CASCADE,
  solicitante_user_id uuid NOT NULL,
  solicitante_tipo text NOT NULL DEFAULT 'transportadora',
  empresa_id integer REFERENCES public.empresas(id),
  motorista_id uuid REFERENCES public.motoristas(id),
  valor_original numeric NOT NULL,
  taxa_percent numeric NOT NULL,
  valor_taxa numeric NOT NULL,
  valor_final numeric NOT NULL,
  dias_antecipados integer NOT NULL,
  data_vencimento_original date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  motivo_rejeicao text,
  aprovado_por uuid,
  aprovado_em timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_antecipacao_status 
  ON public.solicitacoes_antecipacao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_antecipacao_financeiro 
  ON public.solicitacoes_antecipacao(financeiro_entrega_id);

ALTER TABLE public.solicitacoes_antecipacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access solicitacoes_antecipacao"
  ON public.solicitacoes_antecipacao FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Empresa can view own solicitacoes"
  ON public.solicitacoes_antecipacao FOR SELECT TO authenticated
  USING (empresa_id IN (
    SELECT f.empresa_id FROM usuarios u
    JOIN usuarios_filiais uf ON uf.usuario_id = u.id
    JOIN filiais f ON f.id = uf.filial_id
    WHERE u.auth_user_id = auth.uid()
  ));

CREATE POLICY "Empresa can insert solicitacoes"
  ON public.solicitacoes_antecipacao FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (
    SELECT f.empresa_id FROM usuarios u
    JOIN usuarios_filiais uf ON uf.usuario_id = u.id
    JOIN filiais f ON f.id = uf.filial_id
    WHERE u.auth_user_id = auth.uid()
  ));

CREATE TRIGGER trg_solicitacoes_antecipacao_updated_at
  BEFORE UPDATE ON public.solicitacoes_antecipacao
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
