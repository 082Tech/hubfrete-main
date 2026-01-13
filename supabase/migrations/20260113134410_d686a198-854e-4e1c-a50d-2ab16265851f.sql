-- Fix existing functions without search_path (security warnings)
CREATE OR REPLACE FUNCTION public.generate_carga_codigo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  ano TEXT;
  sequencia INTEGER;
BEGIN
  ano := EXTRACT(YEAR FROM NOW())::TEXT;
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo FROM 'CRG-' || ano || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO sequencia
  FROM public.cargas
  WHERE codigo LIKE 'CRG-' || ano || '-%';
  
  NEW.codigo := 'CRG-' || ano || '-' || LPAD(sequencia::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;