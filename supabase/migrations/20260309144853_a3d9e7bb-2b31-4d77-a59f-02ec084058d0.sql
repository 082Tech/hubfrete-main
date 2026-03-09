ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS comissao_hubfrete_percent NUMERIC(5,2) DEFAULT 0;

COMMENT ON COLUMN public.empresas.comissao_hubfrete_percent IS 'Percentage commission HubFrete takes from freight on loads published by this shipper (0-100)';