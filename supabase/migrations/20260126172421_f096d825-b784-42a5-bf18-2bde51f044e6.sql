-- Add new columns to entregas table for notas fiscais (multiple), manifesto and CTE number
ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS notas_fiscais_urls text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS manifesto_url text,
  ADD COLUMN IF NOT EXISTS numero_cte text;

-- Add a comment for clarity
COMMENT ON COLUMN public.entregas.notas_fiscais_urls IS 'Array of URLs for uploaded notas fiscais';
COMMENT ON COLUMN public.entregas.manifesto_url IS 'URL for the manifesto document';
COMMENT ON COLUMN public.entregas.numero_cte IS 'CT-e document number';