
-- Update notify_entrega_status_change to use new URL path /transportadora/cargas
CREATE OR REPLACE FUNCTION public.notify_entrega_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_carga RECORD;
  v_motorista_nome TEXT;
  v_status_label TEXT;
  v_empresa_usuario RECORD;
  v_embarcador_usuario RECORD;
BEGIN
  -- Only process status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get carga info
  SELECT c.codigo, c.empresa_id, c.descricao
  INTO v_carga
  FROM public.cargas c
  WHERE c.id = NEW.carga_id;

  -- Get motorista name
  IF NEW.motorista_id IS NOT NULL THEN
    SELECT m.nome_completo INTO v_motorista_nome
    FROM public.motoristas m
    WHERE m.id = NEW.motorista_id;
  END IF;

  -- Map status to label
  v_status_label := CASE NEW.status
    WHEN 'aguardando' THEN 'Aguardando'
    WHEN 'saiu_para_coleta' THEN 'Saiu para Coleta'
    WHEN 'saiu_para_entrega' THEN 'Saiu para Entrega'
    WHEN 'entregue' THEN 'Entregue'
    WHEN 'cancelada' THEN 'Cancelada'
    ELSE NEW.status
  END;

  -- Notify transportadora users
  FOR v_empresa_usuario IN
    SELECT u.auth_user_id
    FROM public.usuarios u
    JOIN public.motoristas m ON m.empresa_id = u.empresa_id
    WHERE m.id = NEW.motorista_id
      AND u.auth_user_id IS NOT NULL
  LOOP
    INSERT INTO public.notificacoes (
      user_id, tipo, titulo, mensagem, dados, link
    ) VALUES (
      v_empresa_usuario.auth_user_id,
      'status_entrega',
      'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
      'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' teve seu status atualizado para ' || v_status_label,
      jsonb_build_object(
        'entrega_id', NEW.id,
        'carga_id', NEW.carga_id,
        'status', NEW.status,
        'codigo', COALESCE(NEW.codigo, v_carga.codigo),
        'motorista_nome', v_motorista_nome
      ),
      '/transportadora/cargas?entrega=' || NEW.id
    );
  END LOOP;

  -- Notify embarcador users
  FOR v_embarcador_usuario IN
    SELECT u.auth_user_id
    FROM public.usuarios u
    WHERE u.empresa_id = v_carga.empresa_id
      AND u.auth_user_id IS NOT NULL
  LOOP
    INSERT INTO public.notificacoes (
      user_id, tipo, titulo, mensagem, dados, link
    ) VALUES (
      v_embarcador_usuario.auth_user_id,
      'status_entrega',
      'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
      'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' teve seu status atualizado para ' || v_status_label,
      jsonb_build_object(
        'entrega_id', NEW.id,
        'carga_id', NEW.carga_id,
        'status', NEW.status,
        'codigo', COALESCE(NEW.codigo, v_carga.codigo),
        'motorista_nome', v_motorista_nome
      ),
      '/embarcador/cargas?entrega=' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;
