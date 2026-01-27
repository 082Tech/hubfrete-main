-- Create enum for chamado status
CREATE TYPE public.status_chamado AS ENUM ('aberto', 'em_andamento', 'aguardando_resposta', 'resolvido', 'fechado');

-- Create enum for chamado priority
CREATE TYPE public.prioridade_chamado AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Create enum for chamado category
CREATE TYPE public.categoria_chamado AS ENUM ('suporte_tecnico', 'financeiro', 'operacional', 'reclamacao', 'sugestao', 'outros');

-- Create chamados table
CREATE TABLE public.chamados (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria categoria_chamado NOT NULL DEFAULT 'outros',
    prioridade prioridade_chamado NOT NULL DEFAULT 'media',
    status status_chamado NOT NULL DEFAULT 'aberto',
    
    -- Requester info
    solicitante_user_id UUID,
    solicitante_nome TEXT NOT NULL,
    solicitante_email TEXT NOT NULL,
    solicitante_tipo TEXT NOT NULL, -- 'embarcador', 'transportadora', 'motorista'
    empresa_id BIGINT REFERENCES public.empresas(id),
    
    -- Assignment
    atribuido_a UUID REFERENCES public.torre_users(user_id),
    
    -- Resolution
    resolucao TEXT,
    resolvido_em TIMESTAMP WITH TIME ZONE,
    resolvido_por UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chamado_mensagens table for conversation
CREATE TABLE public.chamado_mensagens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_nome TEXT NOT NULL,
    sender_tipo TEXT NOT NULL, -- 'admin', 'solicitante'
    conteudo TEXT NOT NULL,
    anexo_url TEXT,
    anexo_nome TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_chamados_status ON public.chamados(status);
CREATE INDEX idx_chamados_prioridade ON public.chamados(prioridade);
CREATE INDEX idx_chamados_empresa ON public.chamados(empresa_id);
CREATE INDEX idx_chamados_atribuido ON public.chamados(atribuido_a);
CREATE INDEX idx_chamado_mensagens_chamado ON public.chamado_mensagens(chamado_id);

-- Enable RLS
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_mensagens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chamados
-- Admin users can see all chamados
CREATE POLICY "Admin users can view all chamados"
ON public.chamados
FOR SELECT
USING (
    has_admin_role(auth.uid(), 'super_admin') OR
    has_admin_role(auth.uid(), 'admin') OR
    has_admin_role(auth.uid(), 'suporte')
);

-- Users can view their own chamados
CREATE POLICY "Users can view own chamados"
ON public.chamados
FOR SELECT
USING (solicitante_user_id = auth.uid());

-- Anyone authenticated can create chamados
CREATE POLICY "Authenticated can create chamados"
ON public.chamados
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admin users can update chamados
CREATE POLICY "Admin users can update chamados"
ON public.chamados
FOR UPDATE
USING (
    has_admin_role(auth.uid(), 'super_admin') OR
    has_admin_role(auth.uid(), 'admin') OR
    has_admin_role(auth.uid(), 'suporte')
);

-- Admin users can delete chamados
CREATE POLICY "Admin users can delete chamados"
ON public.chamados
FOR DELETE
USING (
    has_admin_role(auth.uid(), 'super_admin') OR
    has_admin_role(auth.uid(), 'admin')
);

-- RLS Policies for chamado_mensagens
-- View messages for chamados user has access to
CREATE POLICY "View messages for accessible chamados"
ON public.chamado_mensagens
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chamados c
        WHERE c.id = chamado_id
        AND (
            c.solicitante_user_id = auth.uid() OR
            has_admin_role(auth.uid(), 'super_admin') OR
            has_admin_role(auth.uid(), 'admin') OR
            has_admin_role(auth.uid(), 'suporte')
        )
    )
);

-- Insert messages for accessible chamados
CREATE POLICY "Insert messages for accessible chamados"
ON public.chamado_mensagens
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chamados c
        WHERE c.id = chamado_id
        AND (
            c.solicitante_user_id = auth.uid() OR
            has_admin_role(auth.uid(), 'super_admin') OR
            has_admin_role(auth.uid(), 'admin') OR
            has_admin_role(auth.uid(), 'suporte')
        )
    )
);

-- Function to generate chamado code
CREATE OR REPLACE FUNCTION public.generate_chamado_codigo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.codigo := 'CH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate codigo
CREATE TRIGGER set_chamado_codigo
BEFORE INSERT ON public.chamados
FOR EACH ROW
WHEN (NEW.codigo IS NULL OR NEW.codigo = '')
EXECUTE FUNCTION public.generate_chamado_codigo();

-- Trigger to update updated_at
CREATE TRIGGER update_chamados_updated_at
BEFORE UPDATE ON public.chamados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();