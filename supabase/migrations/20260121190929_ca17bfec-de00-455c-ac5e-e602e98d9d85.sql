-- Corrigir função notify_entrega_status_change com suporte para motoristas autônomos
CREATE OR REPLACE FUNCTION public.notify_entrega_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carga RECORD;
  v_embarcador_empresa_id BIGINT;
  v_transportadora_empresa_id BIGINT;
  v_motorista RECORD;
  v_status_label TEXT;
  v_user_record RECORD;
BEGIN
  -- Só notifica se o status realmente mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Buscar dados da carga (empresa_id está em cargas, não em enderecos_carga)
  SELECT c.* INTO v_carga FROM cargas c WHERE c.id = NEW.carga_id;
  v_embarcador_empresa_id := v_carga.empresa_id;

  -- Buscar motorista e transportadora
  IF NEW.motorista_id IS NOT NULL THEN
    SELECT m.* INTO v_motorista FROM motoristas m WHERE m.id = NEW.motorista_id;
    v_transportadora_empresa_id := v_motorista.empresa_id;
  END IF;

  -- Mapear status para label legível
  v_status_label := CASE NEW.status
    WHEN 'aguardando_coleta' THEN 'Aguardando Coleta'
    WHEN 'em_coleta' THEN 'Em Coleta'
    WHEN 'coletado' THEN 'Coletado'
    WHEN 'em_transito' THEN 'Em Trânsito'
    WHEN 'em_entrega' THEN 'Em Entrega'
    WHEN 'entregue' THEN 'Entregue'
    WHEN 'devolvida' THEN 'Devolvida'
    WHEN 'cancelada' THEN 'Cancelada'
    ELSE NEW.status::text
  END;

  -- Notificar usuários do embarcador
  IF v_embarcador_empresa_id IS NOT NULL THEN
    FOR v_user_record IN
      SELECT u.auth_user_id
      FROM usuarios u
      JOIN usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN filiais f ON f.id = uf.filial_id
      WHERE f.empresa_id = v_embarcador_empresa_id
        AND u.auth_user_id IS NOT NULL
    LOOP
      INSERT INTO notificacoes (user_id, empresa_id, tipo, titulo, mensagem, dados, link)
      VALUES (
        v_user_record.auth_user_id,
        v_embarcador_empresa_id,
        'status_entrega_alterado',
        'Status da entrega atualizado',
        'A entrega ' || COALESCE(NEW.codigo, NEW.id::text) || ' foi atualizada para: ' || v_status_label,
        jsonb_build_object(
          'entrega_id', NEW.id,
          'status_anterior', OLD.status,
          'status_novo', NEW.status,
          'motorista_nome', v_motorista.nome_completo
        ),
        '/embarcador/entregas?entrega=' || NEW.id::text
      );
    END LOOP;
  END IF;

  -- Notificar usuários da transportadora (se motorista for de frota)
  IF v_transportadora_empresa_id IS NOT NULL THEN
    FOR v_user_record IN
      SELECT u.auth_user_id
      FROM usuarios u
      JOIN usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN filiais f ON f.id = uf.filial_id
      WHERE f.empresa_id = v_transportadora_empresa_id
        AND u.auth_user_id IS NOT NULL
        AND u.auth_user_id != COALESCE(v_motorista.user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO notificacoes (user_id, empresa_id, tipo, titulo, mensagem, dados, link)
      VALUES (
        v_user_record.auth_user_id,
        v_transportadora_empresa_id,
        'status_entrega_alterado',
        'Status da entrega atualizado',
        'A entrega ' || COALESCE(NEW.codigo, NEW.id::text) || ' foi atualizada para: ' || v_status_label,
        jsonb_build_object(
          'entrega_id', NEW.id,
          'status_anterior', OLD.status,
          'status_novo', NEW.status,
          'motorista_nome', v_motorista.nome_completo
        ),
        '/transportadora/entregas?entrega=' || NEW.id::text
      );
    END LOOP;
  END IF;

  -- Notificar o próprio motorista (autônomo ou não) se ele não foi quem alterou
  IF v_motorista.user_id IS NOT NULL 
     AND v_motorista.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) 
  THEN
    INSERT INTO notificacoes (user_id, empresa_id, tipo, titulo, mensagem, dados, link)
    VALUES (
      v_motorista.user_id,
      v_transportadora_empresa_id, -- NULL para autônomos, ok
      'status_entrega_alterado',
      'Status da sua entrega foi atualizado',
      'A entrega ' || COALESCE(NEW.codigo, NEW.id::text) || ' agora está: ' || v_status_label,
      jsonb_build_object(
        'entrega_id', NEW.id,
        'status_anterior', OLD.status,
        'status_novo', NEW.status
      ),
      '/motorista/entregas?entrega=' || NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;