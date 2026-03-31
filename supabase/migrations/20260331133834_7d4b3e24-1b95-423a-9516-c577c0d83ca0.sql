-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::text, auth.uid(), NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::text, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::text, auth.uid(), to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Attach audit triggers to key tables
DO $$
DECLARE
  tbl TEXT;
  tables_to_audit TEXT[] := ARRAY[
    'empresas', 'motoristas', 'veiculos', 'carrocerias',
    'cargas', 'entregas', 'filiais', 'usuarios',
    'usuarios_filiais', 'financeiro_entregas', 'empresa_config_financeira',
    'chats', 'ctes', 'documentos_validacao', 'geofences', 'viagens'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_audit
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- Add index for server-side pagination and filtering
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_timestamp ON auditoria_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_tabela ON auditoria_logs (tabela);
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_operacao ON auditoria_logs (operacao);