
-- Revert status label back to "Saiu para Entrega" in notify_entrega_status_change
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
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT c.codigo, c.empresa_id, c.descricao
  INTO v_carga
  FROM public.cargas c
  WHERE c.id = NEW.carga_id;

  IF NEW.motorista_id IS NOT NULL THEN
    SELECT m.nome_completo INTO v_motorista_nome
    FROM public.motoristas m
    WHERE m.id = NEW.motorista_id;
  END IF;

  v_status_label := CASE NEW.status
    WHEN 'aguardando' THEN 'Aguardando'
    WHEN 'saiu_para_coleta' THEN 'Saiu para Coleta'
    WHEN 'saiu_para_entrega' THEN 'Saiu para Entrega'
    WHEN 'entregue' THEN 'Concluída'
    WHEN 'cancelada' THEN 'Cancelada'
    ELSE NEW.status
  END;

  FOR v_empresa_usuario IN
    SELECT u.auth_user_id
    FROM public.usuarios u
    JOIN public.motoristas m ON m.empresa_id = u.empresa_id
    WHERE m.id = NEW.motorista_id
      AND u.auth_user_id IS NOT NULL
  LOOP
    INSERT INTO public.notificacoes (
      user_id, tipo, titulo, mensagem, link, metadata
    ) VALUES (
      v_empresa_usuario.auth_user_id,
      'status_carga',
      'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
      'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' mudou para ' || v_status_label ||
      CASE WHEN v_motorista_nome IS NOT NULL THEN ' (Motorista: ' || v_motorista_nome || ')' ELSE '' END,
      '/transportadora/operacao',
      jsonb_build_object(
        'entrega_id', NEW.id,
        'carga_id', NEW.carga_id,
        'status', NEW.status,
        'codigo', COALESCE(NEW.codigo, v_carga.codigo)
      )
    );
  END LOOP;

  IF v_carga.empresa_id IS NOT NULL THEN
    FOR v_embarcador_usuario IN
      SELECT u.auth_user_id
      FROM public.usuarios u
      WHERE u.empresa_id = v_carga.empresa_id
        AND u.auth_user_id IS NOT NULL
    LOOP
      INSERT INTO public.notificacoes (
        user_id, tipo, titulo, mensagem, link, metadata
      ) VALUES (
        v_embarcador_usuario.auth_user_id,
        'status_carga',
        'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
        'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' está agora com status: ' || v_status_label ||
        CASE WHEN v_motorista_nome IS NOT NULL THEN '. Motorista: ' || v_motorista_nome ELSE '' END,
        '/embarcador/cargas',
        jsonb_build_object(
          'entrega_id', NEW.id,
          'carga_id', NEW.carga_id,
          'status', NEW.status,
          'codigo', COALESCE(NEW.codigo, v_carga.codigo)
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
