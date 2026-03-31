CREATE OR REPLACE FUNCTION normalize_entrega_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  raw_text TEXT;
  normalized TEXT;
BEGIN
  -- Cast the status to text to handle any case
  raw_text := NEW.status::text;
  
  -- Map common capitalized labels to valid enum values
  normalized := CASE lower(raw_text)
    WHEN 'aguardando' THEN 'aguardando'
    WHEN 'saiu_para_coleta' THEN 'saiu_para_coleta'
    WHEN 'em_transito' THEN 'em_transito'
    WHEN 'saiu_para_entrega' THEN 'saiu_para_entrega'
    WHEN 'entregue' THEN 'entregue'
    WHEN 'cancelada' THEN 'cancelada'
    WHEN 'problema' THEN 'problema'
    ELSE lower(raw_text)
  END;
  
  NEW.status := normalized::status_entrega;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_normalize_entrega_status ON entregas;

CREATE TRIGGER trigger_normalize_entrega_status
  BEFORE INSERT OR UPDATE OF status ON entregas
  FOR EACH ROW
  EXECUTE FUNCTION normalize_entrega_status();