
-- 1. Table: empresa_cargos_config
CREATE TABLE public.empresa_cargos_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id bigint NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  editavel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome)
);

ALTER TABLE public.empresa_cargos_config ENABLE ROW LEVEL SECURITY;

-- Super admins full access
CREATE POLICY "torre_super_admin_all_empresa_cargos"
ON public.empresa_cargos_config
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM torre_users WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true))
WITH CHECK (EXISTS (SELECT 1 FROM torre_users WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true));

-- Company users can view their own cargos
CREATE POLICY "empresa_users_select_own_cargos"
ON public.empresa_cargos_config
FOR SELECT TO authenticated
USING (user_belongs_to_empresa(auth.uid(), empresa_id));

-- Company ADMINs can insert cargos
CREATE POLICY "empresa_admin_insert_cargos"
ON public.empresa_cargos_config
FOR INSERT TO authenticated
WITH CHECK (
  user_belongs_to_empresa(auth.uid(), empresa_id)
  AND EXISTS (SELECT 1 FROM usuarios u WHERE u.auth_user_id = auth.uid() AND u.cargo = 'ADMIN')
);

-- Company ADMINs can update cargos
CREATE POLICY "empresa_admin_update_cargos"
ON public.empresa_cargos_config
FOR UPDATE TO authenticated
USING (
  user_belongs_to_empresa(auth.uid(), empresa_id)
  AND EXISTS (SELECT 1 FROM usuarios u WHERE u.auth_user_id = auth.uid() AND u.cargo = 'ADMIN')
);

-- Company ADMINs can delete editable cargos only
CREATE POLICY "empresa_admin_delete_cargos"
ON public.empresa_cargos_config
FOR DELETE TO authenticated
USING (
  editavel = true
  AND user_belongs_to_empresa(auth.uid(), empresa_id)
  AND EXISTS (SELECT 1 FROM usuarios u WHERE u.auth_user_id = auth.uid() AND u.cargo = 'ADMIN')
);

-- 2. Table: empresa_cargo_permissoes
CREATE TABLE public.empresa_cargo_permissoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_cargo_id uuid NOT NULL REFERENCES public.empresa_cargos_config(id) ON DELETE CASCADE,
  permissao text NOT NULL,
  permitido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_cargo_id, permissao)
);

ALTER TABLE public.empresa_cargo_permissoes ENABLE ROW LEVEL SECURITY;

-- Super admins full access
CREATE POLICY "torre_super_admin_all_empresa_cargo_perms"
ON public.empresa_cargo_permissoes
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM torre_users WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true))
WITH CHECK (EXISTS (SELECT 1 FROM torre_users WHERE user_id = auth.uid() AND role = 'super_admin' AND ativo = true));

-- Company users can view permissions
CREATE POLICY "empresa_users_select_own_cargo_perms"
ON public.empresa_cargo_permissoes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM empresa_cargos_config ecc
  WHERE ecc.id = empresa_cargo_permissoes.empresa_cargo_id
    AND user_belongs_to_empresa(auth.uid(), ecc.empresa_id)
));

-- Company ADMINs can manage permissions
CREATE POLICY "empresa_admin_insert_cargo_perms"
ON public.empresa_cargo_permissoes
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM empresa_cargos_config ecc
  WHERE ecc.id = empresa_cargo_permissoes.empresa_cargo_id
    AND user_belongs_to_empresa(auth.uid(), ecc.empresa_id)
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.auth_user_id = auth.uid() AND u.cargo = 'ADMIN')
));

CREATE POLICY "empresa_admin_update_cargo_perms"
ON public.empresa_cargo_permissoes
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM empresa_cargos_config ecc
  WHERE ecc.id = empresa_cargo_permissoes.empresa_cargo_id
    AND user_belongs_to_empresa(auth.uid(), ecc.empresa_id)
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.auth_user_id = auth.uid() AND u.cargo = 'ADMIN')
));

CREATE POLICY "empresa_admin_delete_cargo_perms"
ON public.empresa_cargo_permissoes
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM empresa_cargos_config ecc
  WHERE ecc.id = empresa_cargo_permissoes.empresa_cargo_id
    AND user_belongs_to_empresa(auth.uid(), ecc.empresa_id)
    AND EXISTS (SELECT 1 FROM usuarios u WHERE u.auth_user_id = auth.uid() AND u.cargo = 'ADMIN')
));

-- 3. Trigger: auto-create ADMIN cargo for new empresas
CREATE OR REPLACE FUNCTION public.fn_create_default_empresa_cargo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO empresa_cargos_config (empresa_id, nome, descricao, editavel)
  VALUES (NEW.id, 'ADMIN', 'Administrador da empresa com acesso total', false);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_default_empresa_cargo
AFTER INSERT ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.fn_create_default_empresa_cargo();

-- 4. Backfill ADMIN for existing empresas
INSERT INTO empresa_cargos_config (empresa_id, nome, descricao, editavel)
SELECT e.id, 'ADMIN', 'Administrador da empresa com acesso total', false
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM empresa_cargos_config ecc WHERE ecc.empresa_id = e.id AND ecc.nome = 'ADMIN'
);

-- 5. RPC: get empresa cargos
CREATE OR REPLACE FUNCTION public.get_empresa_cargos(p_empresa_id bigint)
RETURNS TABLE(id uuid, nome text, descricao text, editavel boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ecc.id, ecc.nome, ecc.descricao, ecc.editavel
  FROM empresa_cargos_config ecc
  WHERE ecc.empresa_id = p_empresa_id
  ORDER BY ecc.editavel ASC, ecc.nome ASC;
$$;

-- 6. RPC: get allowed categories for empresa cargo
CREATE OR REPLACE FUNCTION public.get_empresa_cargo_allowed_categories(p_empresa_cargo_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT split_part(ecp.permissao, '.', 1)),
    '{}'::text[]
  )
  FROM empresa_cargo_permissoes ecp
  WHERE ecp.empresa_cargo_id = p_empresa_cargo_id
    AND ecp.permitido = true;
$$;
