-- Drop all RLS policies from all tables

-- cargas
DROP POLICY IF EXISTS "Admins can view all cargas" ON public.cargas;
DROP POLICY IF EXISTS "Embarcadores can manage own cargas" ON public.cargas;
DROP POLICY IF EXISTS "Transportadoras can view published cargas" ON public.cargas;

-- company_invites
DROP POLICY IF EXISTS "Authenticated users can create invites" ON public.company_invites;
DROP POLICY IF EXISTS "Users can update invites they sent" ON public.company_invites;
DROP POLICY IF EXISTS "Users can view invites sent to them" ON public.company_invites;
DROP POLICY IF EXISTS "Users can view invites they sent" ON public.company_invites;

-- cotacoes
DROP POLICY IF EXISTS "Embarcadores can update cotacoes of own cargas" ON public.cotacoes;
DROP POLICY IF EXISTS "Embarcadores can view cotacoes of own cargas" ON public.cotacoes;
DROP POLICY IF EXISTS "Transportadoras can manage own cotacoes" ON public.cotacoes;

-- embarcadores
DROP POLICY IF EXISTS "Admins can view all embarcadores" ON public.embarcadores;
DROP POLICY IF EXISTS "Users can insert own embarcador" ON public.embarcadores;
DROP POLICY IF EXISTS "Users can update own embarcador" ON public.embarcadores;
DROP POLICY IF EXISTS "Users can view own embarcador" ON public.embarcadores;

-- empresas
DROP POLICY IF EXISTS "Admins can view all empresas" ON public.empresas;
DROP POLICY IF EXISTS "Users can view own empresa" ON public.empresas;

-- enderecos_carga
DROP POLICY IF EXISTS "Transportadoras can view enderecos of published cargas" ON public.enderecos_carga;
DROP POLICY IF EXISTS "Users can manage enderecos of own cargas" ON public.enderecos_carga;

-- entregas
DROP POLICY IF EXISTS "Embarcadores can view entregas of own cargas" ON public.entregas;
DROP POLICY IF EXISTS "Motoristas can update assigned entregas" ON public.entregas;
DROP POLICY IF EXISTS "Motoristas can view and update assigned entregas" ON public.entregas;
DROP POLICY IF EXISTS "Transportadoras can manage own entregas" ON public.entregas;

-- filiais
DROP POLICY IF EXISTS "Admin users can manage filiais" ON public.filiais;
DROP POLICY IF EXISTS "Admins can view all filiais" ON public.filiais;
DROP POLICY IF EXISTS "Users can view filiais of own empresa" ON public.filiais;

-- motoristas
DROP POLICY IF EXISTS "Motoristas can insert own data" ON public.motoristas;
DROP POLICY IF EXISTS "Motoristas can update own data" ON public.motoristas;
DROP POLICY IF EXISTS "Motoristas can view own data" ON public.motoristas;
DROP POLICY IF EXISTS "Transportadoras can view their motoristas" ON public.motoristas;

-- super_admins
DROP POLICY IF EXISTS "No direct access to SuperAdmins" ON public.super_admins;

-- tracking_historico
DROP POLICY IF EXISTS "Motoristas can insert tracking" ON public.tracking_historico;
DROP POLICY IF EXISTS "Tracking visible to involved parties" ON public.tracking_historico;

-- transportadoras
DROP POLICY IF EXISTS "Admins can view all transportadoras" ON public.transportadoras;
DROP POLICY IF EXISTS "Transportadoras publicas podem ser vistas por embarcadores" ON public.transportadoras;
DROP POLICY IF EXISTS "Users can insert own transportadora" ON public.transportadoras;
DROP POLICY IF EXISTS "Users can update own transportadora" ON public.transportadoras;
DROP POLICY IF EXISTS "Users can view own transportadora" ON public.transportadoras;

-- user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- usuarios
DROP POLICY IF EXISTS "Users can update own usuario record" ON public.usuarios;
DROP POLICY IF EXISTS "Users can view own usuario record" ON public.usuarios;
DROP POLICY IF EXISTS "Users can view usuarios of same empresa" ON public.usuarios;

-- usuarios_filiais
DROP POLICY IF EXISTS "Admin users can manage usuarios_filiais" ON public.usuarios_filiais;
DROP POLICY IF EXISTS "Users can view usuarios_filiais of same empresa" ON public.usuarios_filiais;

-- v2f
DROP POLICY IF EXISTS "No direct access to V2F" ON public.v2f;

-- veiculos
DROP POLICY IF EXISTS "Transportadoras can manage own veiculos" ON public.veiculos;

-- Create permissive policies for authenticated users (temporary)
-- These allow all authenticated users to do everything

CREATE POLICY "Allow all for authenticated" ON public.cargas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.company_invites FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.cotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.embarcadores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.enderecos_carga FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.entregas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.filiais FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.motoristas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.super_admins FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.tracking_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.transportadoras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.usuarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.usuarios_filiais FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.v2f FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.veiculos FOR ALL TO authenticated USING (true) WITH CHECK (true);