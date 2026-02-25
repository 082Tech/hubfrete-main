-- 1. Fix the cargo that has empty codigo
UPDATE public.cargas 
SET codigo = 'CRG-2026-0004'
WHERE id = '42df03f3-2260-45cc-9d10-2eab49e29409' AND (codigo IS NULL OR codigo = '');

-- 2. Update trigger to also handle empty strings
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
  -- Only generate if codigo is null or empty
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    ano := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(codigo FROM 'CRG-' || ano || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO sequencia
    FROM public.cargas
    WHERE codigo LIKE 'CRG-' || ano || '-%';
    
    NEW.codigo := 'CRG-' || ano || '-' || LPAD(sequencia::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Add codigo column to entregas table
ALTER TABLE public.entregas ADD COLUMN IF NOT EXISTS codigo TEXT;

-- 4. Create function to generate entrega codigo
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
    -- Get the parent carga codigo
    SELECT codigo INTO carga_codigo FROM public.cargas WHERE id = NEW.carga_id;
    
    IF carga_codigo IS NOT NULL THEN
      -- Count existing entregas for this carga to get sequence
      SELECT COUNT(*) + 1 INTO sequencia 
      FROM public.entregas 
      WHERE carga_id = NEW.carga_id AND id != NEW.id;
      
      -- Format: CRG-2026-0003-E01
      NEW.codigo := carga_codigo || '-E' || LPAD(sequencia::TEXT, 2, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Create trigger for entregas codigo auto-generation
DROP TRIGGER IF EXISTS trigger_generate_entrega_codigo ON public.entregas;
CREATE TRIGGER trigger_generate_entrega_codigo
  BEFORE INSERT ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_entrega_codigo();