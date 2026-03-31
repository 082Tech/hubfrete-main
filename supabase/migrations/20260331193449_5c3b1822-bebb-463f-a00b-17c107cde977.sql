-- 5.1 Trigger de normalização de status
CREATE OR REPLACE FUNCTION normalize_entrega_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  raw_text TEXT;
  normalized TEXT;
BEGIN
  raw_text := NEW.status::text;
  
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

-- 5.2 Trigger de notificação (versão corrigida com join via filiais)
CREATE OR REPLACE FUNCTION public.notify_entrega_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_carga RECORD;
  v_motorista_nome TEXT;
  v_motorista_empresa_id BIGINT;
  v_motorista_user_id UUID;
  v_status_label TEXT;
  v_empresa_usuario RECORD;
  v_embarcador_usuario RECORD;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT c.codigo, c.empresa_id, c.descricao
  INTO v_carga
  FROM public.cargas c
  WHERE c.id = NEW.carga_id;

  IF NEW.motorista_id IS NOT NULL THEN
    SELECT m.nome_completo, m.empresa_id, m.user_id
    INTO v_motorista_nome, v_motorista_empresa_id, v_motorista_user_id
    FROM public.motoristas m
    WHERE m.id = NEW.motorista_id;
  END IF;

  v_status_label := CASE NEW.status::text
    WHEN 'aguardando' THEN 'Aguardando'
    WHEN 'saiu_para_coleta' THEN 'Saiu para Coleta'
    WHEN 'em_transito' THEN 'Em Trânsito'
    WHEN 'saiu_para_entrega' THEN 'Saiu para Entrega'
    WHEN 'entregue' THEN 'Concluída'
    WHEN 'cancelada' THEN 'Cancelada'
    WHEN 'problema' THEN 'Problema'
    ELSE COALESCE(NEW.status::text, 'Atualizada')
  END;

  -- Notificar transportadora
  IF v_motorista_empresa_id IS NOT NULL THEN
    FOR v_empresa_usuario IN
      SELECT DISTINCT u.auth_user_id
      FROM public.usuarios u
      JOIN public.usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN public.filiais f ON f.id = uf.filial_id
      WHERE f.empresa_id = v_motorista_empresa_id
        AND u.auth_user_id IS NOT NULL
    LOOP
      INSERT INTO public.notificacoes (
        user_id, tipo, titulo, mensagem, link, dados
      ) VALUES (
        v_empresa_usuario.auth_user_id,
        'status_entrega_alterado',
        'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
        'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' mudou para ' || v_status_label ||
        CASE WHEN v_motorista_nome IS NOT NULL THEN ' (Motorista: ' || v_motorista_nome || ')' ELSE '' END,
        '/transportadora/operacao',
        jsonb_build_object(
          'entrega_id', NEW.id,
          'carga_id', NEW.carga_id,
          'status', NEW.status::text,
          'codigo', COALESCE(NEW.codigo, v_carga.codigo)
        )
      );
    END LOOP;
  END IF;

  -- Notificar embarcador
  IF v_carga.empresa_id IS NOT NULL THEN
    FOR v_embarcador_usuario IN
      SELECT DISTINCT u.auth_user_id
      FROM public.usuarios u
      JOIN public.usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN public.filiais f ON f.id = uf.filial_id
      WHERE f.empresa_id = v_carga.empresa_id
        AND u.auth_user_id IS NOT NULL
    LOOP
      INSERT INTO public.notificacoes (
        user_id, tipo, titulo, mensagem, link, dados
      ) VALUES (
        v_embarcador_usuario.auth_user_id,
        'status_entrega_alterado',
        'Carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' - ' || v_status_label,
        'A carga ' || COALESCE(NEW.codigo, v_carga.codigo) || ' está agora com status: ' || v_status_label ||
        CASE WHEN v_motorista_nome IS NOT NULL THEN '. Motorista: ' || v_motorista_nome ELSE '' END,
        '/embarcador/cargas',
        jsonb_build_object(
          'entrega_id', NEW.id,
          'carga_id', NEW.carga_id,
          'status', NEW.status::text,
          'codigo', COALESCE(NEW.codigo, v_carga.codigo)
        )
      );
    END LOOP;
  END IF;

  -- Notificar motorista
  IF v_motorista_user_id IS NOT NULL
     AND v_motorista_user_id IS DISTINCT FROM auth.uid()
  THEN
    INSERT INTO public.notificacoes (
      user_id, tipo, titulo, mensagem, link, dados
    ) VALUES (
      v_motorista_user_id,
      'status_entrega_alterado',
      'Status da sua entrega foi atualizado',
      'A entrega ' || COALESCE(NEW.codigo, NEW.id::text) ||
      ' agora está: ' || v_status_label,
      '/motorista/entregas?entrega=' || NEW.id,
      jsonb_build_object(
        'entrega_id', NEW.id,
        'status_anterior', OLD.status::text,
        'status_novo', NEW.status::text
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;