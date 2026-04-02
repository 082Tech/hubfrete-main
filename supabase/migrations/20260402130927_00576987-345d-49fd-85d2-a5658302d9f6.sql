
-- =============================================
-- Tabela de cargos configuráveis
-- =============================================
CREATE TABLE public.cargos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo text NOT NULL CHECK (escopo IN ('torre', 'sistema')),
  nome text NOT NULL,
  descricao text,
  editavel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escopo, nome)
);

ALTER TABLE public.cargos_config ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Tabela de permissões por cargo
-- =============================================
CREATE TABLE public.cargo_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo text NOT NULL CHECK (escopo IN ('torre', 'sistema')),
  cargo text NOT NULL,
  permissao text NOT NULL,
  permitido boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escopo, cargo, permissao)
);

ALTER TABLE public.cargo_permissoes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Triggers para updated_at
-- =============================================
CREATE TRIGGER update_cargos_config_updated_at
  BEFORE UPDATE ON public.cargos_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cargo_permissoes_updated_at
  BEFORE UPDATE ON public.cargo_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Função helper para checar permissão
-- =============================================
CREATE OR REPLACE FUNCTION public.has_cargo_permission(p_escopo text, p_cargo text, p_permissao text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT permitido FROM public.cargo_permissoes
     WHERE escopo = p_escopo AND cargo = p_cargo AND permissao = p_permissao),
    false
  );
$$;

-- =============================================
-- RLS: apenas super_admin pode ler/escrever
-- =============================================
CREATE POLICY "super_admin_select_cargos_config"
  ON public.cargos_config FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.torre_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true
    )
  );

CREATE POLICY "super_admin_insert_cargos_config"
  ON public.cargos_config FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.torre_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true
    )
  );

CREATE POLICY "super_admin_update_cargos_config"
  ON public.cargos_config FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.torre_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true
    )
  );

CREATE POLICY "super_admin_delete_cargos_config"
  ON public.cargos_config FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.torre_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true
    )
  );

CREATE POLICY "super_admin_select_cargo_permissoes"
  ON public.cargo_permissoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.torre_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true
    )
  );

CREATE POLICY "super_admin_insert_cargo_permissoes"
  ON public.cargo_permissoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.torre_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true
    )
  );

CREATE POLICY "super_admin_update_cargo_permissoes"
  ON public.cargo_permissoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.torre_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true
    )
  );

CREATE POLICY "super_admin_delete_cargo_permissoes"
  ON public.cargo_permissoes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.torre_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true
    )
  );

-- =============================================
-- Seed: Cargos Torre
-- =============================================
INSERT INTO public.cargos_config (escopo, nome, descricao, editavel) VALUES
  ('torre', 'super_admin', 'Acesso total à Torre de Controle. Gerencia cargos, permissões e todos os módulos.', false),
  ('torre', 'admin', 'Acesso operacional completo. Pode gerenciar empresas, entregas, financeiro e relatórios.', false),
  ('torre', 'suporte', 'Acesso limitado para atendimento. Visualização de dados e gestão de chamados.', false);

-- Seed: Cargos Sistema
INSERT INTO public.cargos_config (escopo, nome, descricao, editavel) VALUES
  ('sistema', 'ADMIN', 'Administrador da empresa no sistema. Acesso total às funcionalidades da empresa.', false),
  ('sistema', 'OPERADOR', 'Operador da empresa. Acesso operacional limitado conforme permissões configuradas.', false);

-- =============================================
-- Seed: Permissões Torre
-- =============================================
-- Todas as permissões da torre
DO $$
DECLARE
  perms text[] := ARRAY[
    'financeiro.visualizar', 'financeiro.baixa', 'financeiro.exportar',
    'empresas.visualizar', 'empresas.editar', 'empresas.excluir',
    'pre_cadastros.visualizar', 'pre_cadastros.aprovar',
    'logs.visualizar',
    'relatorios.visualizar', 'relatorios.exportar',
    'usuarios.visualizar', 'usuarios.gerenciar',
    'cargos.gerenciar',
    'chamados.visualizar', 'chamados.responder', 'chamados.atribuir',
    'entregas.visualizar', 'entregas.editar',
    'cargas.visualizar', 'cargas.editar',
    'motoristas.visualizar', 'motoristas.editar',
    'veiculos.visualizar', 'veiculos.editar',
    'carrocerias.visualizar', 'carrocerias.editar',
    'ajudantes.visualizar', 'ajudantes.editar',
    'documentos.visualizar', 'documentos.validar',
    'monitoramento.visualizar',
    'kpis.visualizar',
    'storage.visualizar'
  ];
  p text;
BEGIN
  -- super_admin: tudo permitido
  FOREACH p IN ARRAY perms LOOP
    INSERT INTO public.cargo_permissoes (escopo, cargo, permissao, permitido)
    VALUES ('torre', 'super_admin', p, true);
  END LOOP;

  -- admin: quase tudo, exceto cargos.gerenciar
  FOREACH p IN ARRAY perms LOOP
    INSERT INTO public.cargo_permissoes (escopo, cargo, permissao, permitido)
    VALUES ('torre', 'admin', p, p != 'cargos.gerenciar');
  END LOOP;

  -- suporte: apenas visualização + chamados
  FOREACH p IN ARRAY perms LOOP
    INSERT INTO public.cargo_permissoes (escopo, cargo, permissao, permitido)
    VALUES ('torre', 'suporte', p,
      p LIKE '%.visualizar' OR p IN ('chamados.responder')
    );
  END LOOP;
END $$;

-- =============================================
-- Seed: Permissões Sistema
-- =============================================
DO $$
DECLARE
  perms text[] := ARRAY[
    'cargas.criar', 'cargas.editar', 'cargas.visualizar',
    'entregas.visualizar', 'entregas.finalizar',
    'financeiro.visualizar', 'financeiro.exportar',
    'usuarios.visualizar', 'usuarios.convidar', 'usuarios.gerenciar',
    'configuracoes.visualizar', 'configuracoes.editar',
    'frota.visualizar', 'frota.editar',
    'motoristas.visualizar', 'motoristas.editar',
    'relatorios.visualizar', 'relatorios.exportar',
    'mensagens.visualizar', 'mensagens.enviar',
    'filiais.visualizar', 'filiais.editar'
  ];
  p text;
BEGIN
  -- ADMIN: tudo permitido
  FOREACH p IN ARRAY perms LOOP
    INSERT INTO public.cargo_permissoes (escopo, cargo, permissao, permitido)
    VALUES ('sistema', 'ADMIN', p, true);
  END LOOP;

  -- OPERADOR: visualização + operações básicas
  FOREACH p IN ARRAY perms LOOP
    INSERT INTO public.cargo_permissoes (escopo, cargo, permissao, permitido)
    VALUES ('sistema', 'OPERADOR', p,
      p LIKE '%.visualizar' OR p IN ('cargas.criar', 'entregas.finalizar', 'mensagens.enviar')
    );
  END LOOP;
END $$;
