
-- 1. Update the trigger function to generate CRG- codes
CREATE OR REPLACE FUNCTION public.generate_carga_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  ano TEXT;
  sequencia INTEGER;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    ano := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COALESCE(MAX(
      GREATEST(
        COALESCE(CAST(NULLIF(SUBSTRING(codigo FROM 'OFR-' || ano || '-(\d+)'), '') AS INTEGER), 0),
        COALESCE(CAST(NULLIF(SUBSTRING(codigo FROM 'CRG-' || ano || '-(\d+)'), '') AS INTEGER), 0)
      )
    ), 0) + 1
    INTO sequencia
    FROM public.cargas
    WHERE codigo LIKE 'OFR-' || ano || '-%' OR codigo LIKE 'CRG-' || ano || '-%';
    
    NEW.codigo := 'CRG-' || ano || '-' || LPAD(sequencia::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Backfill existing OFR- codes to CRG-
UPDATE public.cargas
SET codigo = REPLACE(codigo, 'OFR-', 'CRG-')
WHERE codigo LIKE 'OFR-%';
