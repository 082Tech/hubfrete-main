-- Add remetente fields to cargas table (similar to destinatario fields)
ALTER TABLE public.cargas
ADD COLUMN IF NOT EXISTS remetente_razao_social text,
ADD COLUMN IF NOT EXISTS remetente_nome_fantasia text,
ADD COLUMN IF NOT EXISTS remetente_cnpj text,
ADD COLUMN IF NOT EXISTS remetente_contato_nome text,
ADD COLUMN IF NOT EXISTS remetente_contato_telefone text;