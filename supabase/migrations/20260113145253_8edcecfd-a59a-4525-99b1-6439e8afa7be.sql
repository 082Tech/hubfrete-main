-- Criar função para obter empresa_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.empresa_id
  FROM "Usuarios" u
  JOIN "Usuarios_Filiais" uf ON uf.usuario_id = u.id
  JOIN "Filiais" f ON f.id = uf.filial_id
  WHERE u.auth_user_id = _user_id
  LIMIT 1
$$;

-- Criar função para obter IDs de filiais do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_filial_ids(_user_id uuid)
RETURNS SETOF bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uf.filial_id
  FROM "Usuarios" u
  JOIN "Usuarios_Filiais" uf ON uf.usuario_id = u.id
  WHERE u.auth_user_id = _user_id
$$;

-- Criar função para verificar se usuário pertence a uma empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(_user_id uuid, _empresa_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "Usuarios" u
    JOIN "Usuarios_Filiais" uf ON uf.usuario_id = u.id
    JOIN "Filiais" f ON f.id = uf.filial_id
    WHERE u.auth_user_id = _user_id
      AND f.empresa_id = _empresa_id
  )
$$;

-- Criar função para verificar se usuário pertence a uma filial
CREATE OR REPLACE FUNCTION public.user_belongs_to_filial(_user_id uuid, _filial_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "Usuarios" u
    JOIN "Usuarios_Filiais" uf ON uf.usuario_id = u.id
    WHERE u.auth_user_id = _user_id
      AND uf.filial_id = _filial_id
  )
$$;

-- =====================
-- RLS para tabela Empresas
-- =====================
ALTER TABLE public."Empresas" ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver empresas que pertencem
CREATE POLICY "Users can view own empresa"
ON public."Empresas"
FOR SELECT
TO authenticated
USING (public.user_belongs_to_empresa(auth.uid(), id));

-- Admins (da HubFrete) podem ver todas
CREATE POLICY "Admins can view all empresas"
ON public."Empresas"
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================
-- RLS para tabela Filiais
-- =====================
ALTER TABLE public."Filiais" ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver filiais da sua empresa
CREATE POLICY "Users can view filiais of own empresa"
ON public."Filiais"
FOR SELECT
TO authenticated
USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- Usuários ADMIN da empresa podem gerenciar filiais
CREATE POLICY "Admin users can manage filiais"
ON public."Filiais"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "Usuarios" u
    JOIN "Usuarios_Filiais" uf ON uf.usuario_id = u.id
    JOIN "Filiais" f ON f.id = uf.filial_id
    WHERE u.auth_user_id = auth.uid()
      AND f.empresa_id = "Filiais".empresa_id
      AND uf.cargo_na_filial = 'ADMIN'
  )
);

-- Admins podem ver todas
CREATE POLICY "Admins can view all filiais"
ON public."Filiais"
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================
-- RLS para tabela Usuarios
-- =====================
ALTER TABLE public."Usuarios" ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver próprio registro
CREATE POLICY "Users can view own usuario record"
ON public."Usuarios"
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Usuários podem ver outros da mesma empresa
CREATE POLICY "Users can view usuarios of same empresa"
ON public."Usuarios"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "Usuarios_Filiais" uf1
    JOIN "Filiais" f1 ON f1.id = uf1.filial_id
    WHERE uf1.usuario_id = "Usuarios".id
      AND public.user_belongs_to_empresa(auth.uid(), f1.empresa_id)
  )
);

-- Usuários podem atualizar próprio registro
CREATE POLICY "Users can update own usuario record"
ON public."Usuarios"
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid());

-- =====================
-- RLS para tabela Usuarios_Filiais
-- =====================
ALTER TABLE public."Usuarios_Filiais" ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver vínculos da mesma empresa
CREATE POLICY "Users can view usuarios_filiais of same empresa"
ON public."Usuarios_Filiais"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "Filiais" f
    WHERE f.id = "Usuarios_Filiais".filial_id
      AND public.user_belongs_to_empresa(auth.uid(), f.empresa_id)
  )
);

-- Admins da empresa podem gerenciar vínculos
CREATE POLICY "Admin users can manage usuarios_filiais"
ON public."Usuarios_Filiais"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "Usuarios" u
    JOIN "Usuarios_Filiais" uf ON uf.usuario_id = u.id
    JOIN "Filiais" f ON f.id = uf.filial_id
    JOIN "Filiais" target_f ON target_f.id = "Usuarios_Filiais".filial_id
    WHERE u.auth_user_id = auth.uid()
      AND f.empresa_id = target_f.empresa_id
      AND uf.cargo_na_filial = 'ADMIN'
  )
);

-- =====================
-- RLS para tabela V2F (códigos 2FA - privado)
-- =====================
ALTER TABLE public."V2F" ENABLE ROW LEVEL SECURITY;

-- Ninguém pode ler diretamente (apenas edge functions)
CREATE POLICY "No direct access to V2F"
ON public."V2F"
FOR SELECT
TO authenticated
USING (false);

-- =====================
-- RLS para tabela SuperAdmins (privado)
-- =====================
ALTER TABLE public."SuperAdmins" ENABLE ROW LEVEL SECURITY;

-- Ninguém pode ler diretamente (apenas edge functions com service role)
CREATE POLICY "No direct access to SuperAdmins"
ON public."SuperAdmins"
FOR SELECT
TO authenticated
USING (false);