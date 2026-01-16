-- Add destinatario (recipient company) fields to cargas table
-- These fields store the destination company info directly on the cargo

ALTER TABLE public.cargas
ADD COLUMN destinatario_razao_social text,
ADD COLUMN destinatario_nome_fantasia text,
ADD COLUMN destinatario_cnpj text,
ADD COLUMN destinatario_contato_nome text,
ADD COLUMN destinatario_contato_telefone text,
ADD COLUMN destinatario_contato_email text;

-- Add optional link to contatos_destino for traceability (when selected from contact book)
ALTER TABLE public.cargas
ADD COLUMN contato_destino_id uuid REFERENCES public.contatos_destino(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_cargas_contato_destino_id ON public.cargas(contato_destino_id);

-- Add comment for documentation
COMMENT ON COLUMN public.cargas.destinatario_razao_social IS 'Razão social da empresa destinatária';
COMMENT ON COLUMN public.cargas.destinatario_nome_fantasia IS 'Nome fantasia da empresa destinatária';
COMMENT ON COLUMN public.cargas.destinatario_cnpj IS 'CNPJ da empresa destinatária';
COMMENT ON COLUMN public.cargas.contato_destino_id IS 'Referência opcional ao contato de destino pré-cadastrado';