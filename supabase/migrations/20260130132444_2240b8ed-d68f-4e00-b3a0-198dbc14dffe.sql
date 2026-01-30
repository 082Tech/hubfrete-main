-- =====================================================
-- SECURITY FIX: Enable RLS on AI Chat Tables
-- =====================================================

-- Enable RLS on ia_active_chat
ALTER TABLE public.ia_active_chat ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ia_search_chat  
ALTER TABLE public.ia_search_chat ENABLE ROW LEVEL SECURITY;

-- Add restrictive policies for ia_active_chat (deny all by default - system only)
CREATE POLICY "Deny all access to ia_active_chat"
ON public.ia_active_chat FOR ALL
USING (false);

-- Add restrictive policies for ia_search_chat (deny all by default - system only)
CREATE POLICY "Deny all access to ia_search_chat"
ON public.ia_search_chat FOR ALL
USING (false);

-- =====================================================
-- SECURITY FIX: Fix contatos_destino RLS
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.contatos_destino;

-- Create proper empresa_id based policies
CREATE POLICY "Users can view contacts from their empresa"
ON public.contatos_destino FOR SELECT
USING (user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "Users can insert contacts for their empresa"
ON public.contatos_destino FOR INSERT
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "Users can update contacts from their empresa"
ON public.contatos_destino FOR UPDATE
USING (user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE POLICY "Users can delete contacts from their empresa"
ON public.contatos_destino FOR DELETE
USING (user_belongs_to_empresa(auth.uid(), empresa_id));

-- =====================================================
-- SECURITY FIX: Fix super_admins RLS (sensitive table)
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.super_admins;

-- Only super_admins can access this table
CREATE POLICY "Only super_admins can view super_admins"
ON public.super_admins FOR SELECT
USING (has_admin_role(auth.uid(), 'super_admin'::admin_role));

CREATE POLICY "Only super_admins can modify super_admins"
ON public.super_admins FOR ALL
USING (has_admin_role(auth.uid(), 'super_admin'::admin_role));

-- =====================================================
-- SECURITY FIX: Fix company_invites RLS
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.company_invites;

-- Users can only manage invites for their company
CREATE POLICY "Users can view invites for their company"
ON public.company_invites FOR SELECT
USING (user_belongs_to_empresa(auth.uid(), company_id) OR email = auth.email());

CREATE POLICY "Users can create invites for their company"
ON public.company_invites FOR INSERT
WITH CHECK (user_belongs_to_empresa(auth.uid(), company_id));

CREATE POLICY "Users can update invites for their company"
ON public.company_invites FOR UPDATE
USING (user_belongs_to_empresa(auth.uid(), company_id));

CREATE POLICY "Users can delete invites for their company"
ON public.company_invites FOR DELETE
USING (user_belongs_to_empresa(auth.uid(), company_id));