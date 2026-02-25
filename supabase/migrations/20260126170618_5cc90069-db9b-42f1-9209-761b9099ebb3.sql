-- First, drop the trigger that depends on the status column
DROP TRIGGER IF EXISTS trigger_entrega_status_change ON public.entregas;

-- Drop the type that was partially created in failed migration
DROP TYPE IF EXISTS public.status_entrega_new;

-- Create new enum with simplified statuses
CREATE TYPE public.status_entrega_new AS ENUM (
  'aguardando',
  'saiu_para_coleta',
  'saiu_para_entrega',
  'entregue',
  'problema',
  'cancelada'
);

-- Update tracking_historico table first (convert old statuses to new ones)
ALTER TABLE public.tracking_historico 
  ALTER COLUMN status DROP DEFAULT;

-- Create a temporary column
ALTER TABLE public.tracking_historico 
  ADD COLUMN status_temp text;

-- Copy and convert the data
UPDATE public.tracking_historico SET status_temp = 
  CASE status::text
    WHEN 'aguardando_coleta' THEN 'aguardando'
    WHEN 'em_coleta' THEN 'saiu_para_coleta'
    WHEN 'coletado' THEN 'saiu_para_coleta'
    WHEN 'em_transito' THEN 'saiu_para_entrega'
    WHEN 'em_entrega' THEN 'saiu_para_entrega'
    WHEN 'entregue' THEN 'entregue'
    WHEN 'problema' THEN 'problema'
    WHEN 'devolvida' THEN 'cancelada'
    WHEN 'cancelada' THEN 'cancelada'
    ELSE 'aguardando'
  END;

-- Drop the old column and rename the new one
ALTER TABLE public.tracking_historico DROP COLUMN status;
ALTER TABLE public.tracking_historico RENAME COLUMN status_temp TO status;

-- Now do the same for entregas table
ALTER TABLE public.entregas 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.entregas 
  ADD COLUMN status_temp text;

UPDATE public.entregas SET status_temp = 
  CASE status::text
    WHEN 'aguardando_coleta' THEN 'aguardando'
    WHEN 'em_coleta' THEN 'saiu_para_coleta'
    WHEN 'coletado' THEN 'saiu_para_coleta'
    WHEN 'em_transito' THEN 'saiu_para_entrega'
    WHEN 'em_entrega' THEN 'saiu_para_entrega'
    WHEN 'entregue' THEN 'entregue'
    WHEN 'problema' THEN 'problema'
    WHEN 'devolvida' THEN 'cancelada'
    WHEN 'cancelada' THEN 'cancelada'
    ELSE 'aguardando'
  END;

ALTER TABLE public.entregas DROP COLUMN status;
ALTER TABLE public.entregas RENAME COLUMN status_temp TO status;

-- Drop the old enum
DROP TYPE public.status_entrega;

-- Rename the new enum to the original name
ALTER TYPE public.status_entrega_new RENAME TO status_entrega;

-- Add the enum type back to the columns
ALTER TABLE public.tracking_historico 
  ALTER COLUMN status TYPE public.status_entrega USING status::public.status_entrega;

ALTER TABLE public.entregas 
  ALTER COLUMN status TYPE public.status_entrega USING status::public.status_entrega;

-- Set defaults
ALTER TABLE public.tracking_historico 
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.entregas 
  ALTER COLUMN status SET DEFAULT 'aguardando'::public.status_entrega;

-- Recreate the trigger
CREATE TRIGGER trigger_entrega_status_change
  AFTER UPDATE OF status ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_entrega_status_change();

-- Update the notify function to use new status labels
CREATE OR REPLACE FUNCTION public.notify_entrega_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  v_carga RECORD;
  v_embarcador_empresa_id BIGINT;
  v_transportadora_empresa_id BIGINT;
  v_motorista RECORD;
  v_status_label TEXT;
  v_user_record RECORD;
  v_motorista_nome TEXT;
BEGIN
  -- Só notifica se o status realmente mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Buscar carga
  SELECT c.*
  INTO v_carga
  FROM cargas c
  WHERE c.id = NEW.carga_id;

  v_embarcador_empresa_id := v_carga.empresa_id;

  -- Buscar motorista (se houver)
  IF NEW.motorista_id IS NOT NULL THEN
    SELECT m.*
    INTO v_motorista
    FROM motoristas m
    WHERE m.id = NEW.motorista_id;

    v_transportadora_empresa_id := v_motorista.empresa_id;
    v_motorista_nome := v_motorista.nome_completo;
  ELSE
    v_transportadora_empresa_id := NULL;
    v_motorista_nome := NULL;
  END IF;

  -- Mapear status (novos valores)
  v_status_label := CASE NEW.status
    WHEN 'aguardando' THEN 'Aguardando'
    WHEN 'saiu_para_coleta' THEN 'Saiu para Coleta'
    WHEN 'saiu_para_entrega' THEN 'Saiu para Entrega'
    WHEN 'entregue' THEN 'Entregue'
    WHEN 'problema' THEN 'Problema'
    WHEN 'cancelada' THEN 'Cancelada'
    ELSE NEW.status::text
  END;

  -- 🔔 Notificar usuários do embarcador
  IF v_embarcador_empresa_id IS NOT NULL THEN
    FOR v_user_record IN
      SELECT u.auth_user_id
      FROM usuarios u
      JOIN usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN filiais f ON f.id = uf.filial_id
      WHERE f.empresa_id = v_embarcador_empresa_id
        AND u.auth_user_id IS NOT NULL
    LOOP
      INSERT INTO notificacoes (
        user_id, empresa_id, tipo, titulo, mensagem, dados, link
      ) VALUES (
        v_user_record.auth_user_id,
        v_embarcador_empresa_id,
        'status_entrega_alterado',
        'Status da entrega atualizado',
        'A entrega ' || COALESCE(NEW.codigo, NEW.id::text) ||
        ' foi atualizada para: ' || v_status_label,
        jsonb_build_object(
          'entrega_id', NEW.id,
          'status_anterior', OLD.status,
          'status_novo', NEW.status,
          'motorista_nome', v_motorista_nome
        ),
        '/embarcador/cargas/em-rota?entrega=' || NEW.id
      );
    END LOOP;
  END IF;

  -- 🔔 Notificar usuários da transportadora (se houver)
  IF v_transportadora_empresa_id IS NOT NULL THEN
    FOR v_user_record IN
      SELECT u.auth_user_id
      FROM usuarios u
      JOIN usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN filiais f ON f.id = uf.filial_id
      WHERE f.empresa_id = v_transportadora_empresa_id
        AND u.auth_user_id IS NOT NULL
        AND u.auth_user_id IS DISTINCT FROM v_motorista.user_id
    LOOP
      INSERT INTO notificacoes (
        user_id, empresa_id, tipo, titulo, mensagem, dados, link
      ) VALUES (
        v_user_record.auth_user_id,
        v_transportadora_empresa_id,
        'status_entrega_alterado',
        'Status da entrega atualizado',
        'A entrega ' || COALESCE(NEW.codigo, NEW.id::text) ||
        ' foi atualizada para: ' || v_status_label,
        jsonb_build_object(
          'entrega_id', NEW.id,
          'status_anterior', OLD.status,
          'status_novo', NEW.status,
          'motorista_nome', v_motorista_nome
        ),
        '/transportadora/entregas?entrega=' || NEW.id
      );
    END LOOP;
  END IF;

  -- 🔔 Notificar o próprio motorista (se existir)
  IF NEW.motorista_id IS NOT NULL
     AND v_motorista.user_id IS NOT NULL
     AND v_motorista.user_id IS DISTINCT FROM auth.uid()
  THEN
    INSERT INTO notificacoes (
      user_id, empresa_id, tipo, titulo, mensagem, dados, link
    ) VALUES (
      v_motorista.user_id,
      v_transportadora_empresa_id,
      'status_entrega_alterado',
      'Status da sua entrega foi atualizado',
      'A entrega ' || COALESCE(NEW.codigo, NEW.id::text) ||
      ' agora está: ' || v_status_label,
      jsonb_build_object(
        'entrega_id', NEW.id,
        'status_anterior', OLD.status,
        'status_novo', NEW.status
      ),
      '/motorista/entregas?entrega=' || NEW.id
    );
  END IF;

  RETURN NEW;
END;$function$;