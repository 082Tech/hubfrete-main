-- Create enum for pre-registration status
CREATE TYPE public.status_pre_cadastro AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- Create enum for admin roles
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'suporte');

-- Create pre_cadastros table
CREATE TABLE public.pre_cadastros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('embarcador', 'transportadora', 'motorista')),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cnpj TEXT,
  cpf TEXT,
  nome_empresa TEXT,
  status status_pre_cadastro NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  analisado_por UUID REFERENCES auth.users(id),
  analisado_em TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create admin_users table for Torre de Controle access
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'suporte',
  nome TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.pre_cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create function to check admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id UUID, _role admin_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id
      AND role = _role
      AND ativo = true
  )
$$;

-- Create function to check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id
      AND ativo = true
  )
$$;

-- Create function to get admin role
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id UUID)
RETURNS admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.admin_users
  WHERE user_id = _user_id
    AND ativo = true
  LIMIT 1
$$;

-- RLS Policies for pre_cadastros
-- Anyone can insert (public registration)
CREATE POLICY "Anyone can submit pre-registration"
ON public.pre_cadastros
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view
CREATE POLICY "Admins can view all pre-registrations"
ON public.pre_cadastros
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only admins can update
CREATE POLICY "Admins can update pre-registrations"
ON public.pre_cadastros
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for admin_users
-- Only super_admin can manage admin_users
CREATE POLICY "Super admins can view all admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.has_admin_role(auth.uid(), 'super_admin') OR user_id = auth.uid());

CREATE POLICY "Super admins can insert admin users"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update admin users"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (public.has_admin_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete admin users"
ON public.admin_users
FOR DELETE
TO authenticated
USING (public.has_admin_role(auth.uid(), 'super_admin'));

-- Create updated_at trigger
CREATE TRIGGER update_pre_cadastros_updated_at
BEFORE UPDATE ON public.pre_cadastros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();