-- Renomear tabela admin_users para torre_users
ALTER TABLE public.admin_users RENAME TO torre_users;

-- Atualizar funções para usar a nova tabela torre_users
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid, _role admin_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.torre_users
    WHERE user_id = _user_id
      AND role = _role
      AND ativo = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.torre_users
    WHERE user_id = _user_id
      AND ativo = true
  )
$$;

CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id uuid)
RETURNS admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.torre_users
  WHERE user_id = _user_id
    AND ativo = true
  LIMIT 1
$$;

-- Atualizar RLS policies para usar torre_users
DROP POLICY IF EXISTS "Super admins can delete admin users" ON public.torre_users;
DROP POLICY IF EXISTS "Super admins can insert admin users" ON public.torre_users;
DROP POLICY IF EXISTS "Super admins can update admin users" ON public.torre_users;
DROP POLICY IF EXISTS "Super admins can view all admin users" ON public.torre_users;

CREATE POLICY "Super admins can delete torre users"
ON public.torre_users
FOR DELETE
USING (has_admin_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert torre users"
ON public.torre_users
FOR INSERT
WITH CHECK (has_admin_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update torre users"
ON public.torre_users
FOR UPDATE
USING (has_admin_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins and admins can view torre users"
ON public.torre_users
FOR SELECT
USING (has_admin_role(auth.uid(), 'super_admin') OR has_admin_role(auth.uid(), 'admin') OR (user_id = auth.uid()));