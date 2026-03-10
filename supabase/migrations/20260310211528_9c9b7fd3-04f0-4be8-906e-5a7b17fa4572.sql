
-- 2. New columns on existing tables
ALTER TABLE public.cargas ADD COLUMN IF NOT EXISTS numero_pedido TEXT DEFAULT NULL;

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS comissao_hubfrete_percent NUMERIC(5,2) DEFAULT 10 NOT NULL;
COMMENT ON COLUMN public.empresas.comissao_hubfrete_percent IS 'Percentual de comissão HubFrete sobre fretes de cargas deste embarcador (0-100)';

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS dados_bancarios JSONB DEFAULT NULL;

ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS outros_documentos JSONB DEFAULT NULL;
