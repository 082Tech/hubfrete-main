
-- 1. Add empresa_nome column
ALTER TABLE public.auditoria_logs ADD COLUMN IF NOT EXISTS empresa_nome text;

-- 2. Update trigger to resolve empresa_nome automatically
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
  v_empresa_id bigint;
  v_empresa_nome text;
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

  -- Extract record as jsonb
  IF TG_OP = 'DELETE' THEN
    v_record := to_jsonb(OLD);
  ELSE
    v_record := to_jsonb(NEW);
  END IF;

  v_registro_codigo := v_record ->> 'codigo';

  -- Resolve empresa_nome from empresa_id in the record
  v_empresa_id := (v_record ->> 'empresa_id')::bigint;
  IF v_empresa_id IS NOT NULL THEN
    SELECT COALESCE(nome_fantasia, razao_social, nome)
    INTO v_empresa_nome
    FROM public.empresas
    WHERE id = v_empresa_id
    LIMIT 1;
  END IF;

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
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, usuario_nome, registro_codigo, ip_address, descricao, dados_anteriores, dados_novos, empresa_nome)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::text, v_user_id, v_user_nome, v_registro_codigo, v_ip, v_descricao, NULL, to_jsonb(NEW), v_empresa_nome);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, usuario_nome, registro_codigo, ip_address, descricao, dados_anteriores, dados_novos, empresa_nome)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::text, v_user_id, v_user_nome, v_registro_codigo, v_ip, v_descricao, to_jsonb(OLD), to_jsonb(NEW), v_empresa_nome);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria_logs (tabela, operacao, registro_id, usuario_id, usuario_nome, registro_codigo, ip_address, descricao, dados_anteriores, dados_novos, empresa_nome)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::text, v_user_id, v_user_nome, v_registro_codigo, v_ip, v_descricao, to_jsonb(OLD), NULL, v_empresa_nome);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- 3. Backfill empresa_nome for existing records using dados_novos
UPDATE auditoria_logs al
SET empresa_nome = e.nome_display
FROM (
  SELECT al2.id AS log_id,
         COALESCE(emp.nome_fantasia, emp.razao_social, emp.nome) AS nome_display
  FROM auditoria_logs al2
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (al2.dados_novos ->> 'empresa_id'),
      (al2.dados_anteriores ->> 'empresa_id')
    ) AS eid
  ) parsed
  JOIN empresas emp ON emp.id = parsed.eid::bigint
  WHERE al2.empresa_nome IS NULL
    AND parsed.eid IS NOT NULL
    AND parsed.eid ~ '^\d+$'
) e
WHERE al.id = e.log_id;

-- 4. Backfill for entregas via carga -> empresa
UPDATE auditoria_logs al
SET empresa_nome = e.nome_display
FROM (
  SELECT al2.id AS log_id,
         COALESCE(emp.nome_fantasia, emp.razao_social, emp.nome) AS nome_display
  FROM auditoria_logs al2
  JOIN cargas c ON c.id = (
    COALESCE(al2.dados_novos ->> 'carga_id', al2.dados_anteriores ->> 'carga_id')
  )::uuid
  JOIN empresas emp ON emp.id = c.empresa_id
  WHERE al2.empresa_nome IS NULL
    AND al2.tabela = 'entregas'
    AND COALESCE(al2.dados_novos ->> 'carga_id', al2.dados_anteriores ->> 'carga_id') IS NOT NULL
) e
WHERE al.id = e.log_id;
