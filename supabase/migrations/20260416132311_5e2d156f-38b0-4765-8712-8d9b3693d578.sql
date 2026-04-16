
-- 1. Revert cargas trigger back to OFR- prefix
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
    
    NEW.codigo := 'OFR-' || ano || '-' || LPAD(sequencia::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Backfill cargas: revert CRG- back to OFR-
UPDATE public.cargas
SET codigo = REPLACE(codigo, 'CRG-', 'OFR-')
WHERE codigo LIKE 'CRG-%';

-- 3. Update entregas trigger to generate CRG-yyyy-XXXX (independent sequence)
CREATE OR REPLACE FUNCTION public.generate_entrega_codigo()
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
        COALESCE(CAST(NULLIF(SUBSTRING(codigo FROM 'CRG-' || ano || '-(\d+)'), '') AS INTEGER), 0),
        COALESCE(CAST(NULLIF(SUBSTRING(codigo FROM 'OFR-' || ano || '-\d+-C(\d+)'), '') AS INTEGER), 0)
      )
    ), 0) + 1
    INTO sequencia
    FROM public.entregas
    WHERE codigo LIKE 'CRG-' || ano || '-%' OR codigo LIKE 'OFR-' || ano || '-%';
    
    NEW.codigo := 'CRG-' || ano || '-' || LPAD(sequencia::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Backfill entregas: convert OFR-yyyy-XXXX-CXX to CRG-yyyy-XXXX format
-- We need to assign new sequential CRG codes to existing entregas
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 0;
  ano TEXT;
BEGIN
  FOR rec IN 
    SELECT id, codigo FROM public.entregas 
    WHERE codigo LIKE 'OFR-%'
    ORDER BY created_at ASC
  LOOP
    counter := counter + 1;
    ano := EXTRACT(YEAR FROM NOW())::TEXT;
    UPDATE public.entregas 
    SET codigo = 'CRG-' || ano || '-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = rec.id;
  END LOOP;
END;
$$;
