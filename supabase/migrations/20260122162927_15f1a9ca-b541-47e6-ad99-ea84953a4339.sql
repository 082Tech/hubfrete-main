-- Fix type mismatch: change company_id from UUID to BIGINT
ALTER TABLE public.company_invites 
ALTER COLUMN company_id TYPE BIGINT USING company_id::text::bigint;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_company_invites_company_id ON public.company_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_email_status ON public.company_invites(email, status);