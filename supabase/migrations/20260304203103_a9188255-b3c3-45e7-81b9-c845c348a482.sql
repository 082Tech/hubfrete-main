
-- 1. Atualizar trigger generate_carga_codigo para usar prefixo OFR-
CREATE OR REPLACE FUNCTION public.generate_carga_codigo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- 2. Atualizar trigger generate_entrega_codigo para usar sufixo -C em vez de -E
CREATE OR REPLACE FUNCTION public.generate_entrega_codigo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  carga_codigo TEXT;
  sequencia INTEGER;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT codigo INTO carga_codigo FROM public.cargas WHERE id = NEW.carga_id;
    
    IF carga_codigo IS NOT NULL THEN
      SELECT COUNT(*) + 1 INTO sequencia 
      FROM public.entregas 
      WHERE carga_id = NEW.carga_id AND id != NEW.id;
      
      NEW.codigo := carga_codigo || '-C' || LPAD(sequencia::TEXT, 2, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Migrar códigos existentes: CRG- → OFR- nas cargas
UPDATE public.cargas
SET codigo = REPLACE(codigo, 'CRG-', 'OFR-')
WHERE codigo LIKE 'CRG-%';

-- 4. Migrar códigos existentes nas entregas: CRG- → OFR- e -E → -C
UPDATE public.entregas
SET codigo = REGEXP_REPLACE(
  REPLACE(codigo, 'CRG-', 'OFR-'),
  '-E(\d+)$',
  '-C\1'
)
WHERE codigo LIKE 'CRG-%' OR codigo LIKE '%-E%';
