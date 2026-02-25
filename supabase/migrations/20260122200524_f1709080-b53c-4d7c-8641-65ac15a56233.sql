-- Create table for driver invite links
CREATE TABLE public.driver_invite_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id bigint NOT NULL,
    codigo_acesso text NOT NULL,
    max_usos integer NOT NULL DEFAULT 10,
    usos_realizados integer NOT NULL DEFAULT 0,
    expira_em timestamp with time zone NOT NULL,
    ativo boolean NOT NULL DEFAULT true,
    nome_link text, -- optional friendly name
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_invite_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view links from their company
CREATE POLICY "Users can view company invite links"
ON public.driver_invite_links
FOR SELECT
USING (user_belongs_to_empresa(auth.uid(), empresa_id));

-- Policy: Users can insert links for their company
CREATE POLICY "Users can create company invite links"
ON public.driver_invite_links
FOR INSERT
WITH CHECK (user_belongs_to_empresa(auth.uid(), empresa_id));

-- Policy: Users can update links from their company
CREATE POLICY "Users can update company invite links"
ON public.driver_invite_links
FOR UPDATE
USING (user_belongs_to_empresa(auth.uid(), empresa_id));

-- Policy: Users can delete links from their company
CREATE POLICY "Users can delete company invite links"
ON public.driver_invite_links
FOR DELETE
USING (user_belongs_to_empresa(auth.uid(), empresa_id));

-- Policy: Public can read active non-expired links (for self-registration)
CREATE POLICY "Public can read active links"
ON public.driver_invite_links
FOR SELECT
TO anon
USING (ativo = true AND expira_em > now() AND usos_realizados < max_usos);

-- Add trigger for updated_at
CREATE TRIGGER update_driver_invite_links_updated_at
BEFORE UPDATE ON public.driver_invite_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_driver_invite_links_empresa ON public.driver_invite_links(empresa_id);
CREATE INDEX idx_driver_invite_links_active ON public.driver_invite_links(ativo, expira_em) WHERE ativo = true;