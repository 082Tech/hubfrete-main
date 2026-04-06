
-- 1. Add enrichment columns to auditoria_logs
ALTER TABLE public.auditoria_logs
  ADD COLUMN IF NOT EXISTS usuario_nome text,
  ADD COLUMN IF NOT EXISTS registro_codigo text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS descricao text;

-- 2. Replace the trigger function with enriched version
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_user_nome text;
  v_registro_codigo text;
  v_ip text;
  v_descricao text;
  v_operacao_label text;
  v_record jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Lookup user name from usuarios or torre_users
  IF v_user_id IS NOT NULL THEN
    SELECT nome INTO v_user_nome FROM public.usuarios WHERE auth_user_id = v_user_id LIMIT 1;
    IF v_user_nome IS NULL THEN
      SELECT nome INTO v_user_nome FROM public.torre_users WHERE user_id = v_user_id LIMIT 1;
    END IF;
  END IF;

  -- Extract codigo from the record if the column exists
  IF TG_OP = 'DELETE' THEN
    v_record := to_jsonb(OLD);
  ELSE
    v_record := to_jsonb(NEW);
  END IF;
  v_registro_codigo := v_record ->> 'codigo';

  -- Extract IP from PostgREST headers (best effort)
  BEGIN
    v_ip := current_setting('request.headers', true)::json ->> 'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  -- Build human-readable description
  CASE TG_OP
    WHEN 'INSERT' THEN v_operacao_label := 'Criou';
    WHEN 'UPDATE' THEN v_operacao_label := 'Atualizou';
    WHEN 'DELETE' THEN v_operacao_label := 'Removeu';
    ELSE v_operacao_label := TG_OP;
  END CASE;

  v_descricao := v_operacao_label || ' registro em ' || TG_TABLE_NAME;
  IF v_registro_codigo IS NOT NULL THEN
    v_descricao := v_descricao || ' (' || v_registro_codigo || ')';
  END IF;

  -- Insert the audit log
  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, usuario_nome, registro_codigo, ip_address, descricao, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::text, v_user_id, v_user_nome, v_registro_codigo, v_ip, v_descricao, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, usuario_nome, registro_codigo, ip_address, descricao, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::text, v_user_id, v_user_nome, v_registro_codigo, v_ip, v_descricao, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, usuario_nome, registro_codigo, ip_address, descricao, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::text, v_user_id, v_user_nome, v_registro_codigo, v_ip, v_descricao, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- 3. Add audit triggers to critical tables not yet audited
CREATE TRIGGER audit_company_invites
AFTER INSERT OR UPDATE OR DELETE ON public.company_invites
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_cargo_permissoes
AFTER INSERT OR UPDATE OR DELETE ON public.cargo_permissoes
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TRIGGER audit_entrega_eventos
AFTER INSERT OR UPDATE OR DELETE ON public.entrega_eventos
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
