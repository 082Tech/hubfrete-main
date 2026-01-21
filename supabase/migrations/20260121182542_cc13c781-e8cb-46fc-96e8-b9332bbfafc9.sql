-- Criar enum para tipos de notificação
CREATE TYPE public.tipo_notificacao AS ENUM (
  'status_entrega_alterado',
  'nova_mensagem',
  'motorista_adicionado',
  'carga_publicada',
  'entrega_aceita',
  'entrega_concluida',
  'cte_anexado'
);

-- Criar tabela de notificações
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  empresa_id BIGINT,
  tipo tipo_notificacao NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  dados JSONB DEFAULT '{}'::jsonb,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver suas próprias notificações
CREATE POLICY "Users can view own notifications"
ON public.notificacoes
FOR SELECT
USING (auth.uid() = user_id);

-- Política: usuários podem atualizar suas próprias notificações (marcar como lida)
CREATE POLICY "Users can update own notifications"
ON public.notificacoes
FOR UPDATE
USING (auth.uid() = user_id);

-- Política: sistema pode inserir notificações (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notificacoes
FOR INSERT
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX idx_notificacoes_empresa_id ON public.notificacoes(empresa_id);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(user_id, lida) WHERE lida = false;
CREATE INDEX idx_notificacoes_created_at ON public.notificacoes(created_at DESC);

-- ============================================
-- TRIGGER: Notificação quando status de entrega muda
-- ============================================
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

  -- Buscar dados da carga
  SELECT c.*, e.empresa_id as embarcador_empresa_id
  INTO v_carga
  FROM cargas c
  LEFT JOIN enderecos_carga e ON e.carga_id = c.id AND e.tipo = 'origem'
  WHERE c.id = NEW.carga_id;

  v_embarcador_empresa_id := COALESCE(v_carga.empresa_id, v_carga.embarcador_empresa_id);

  -- Buscar motorista e transportadora
  IF NEW.motorista_id IS NOT NULL THEN
    SELECT m.*, m.empresa_id as transportadora_empresa_id, m.nome_completo
    INTO v_motorista
    FROM motoristas m
    WHERE m.id = NEW.motorista_id;
    
    v_transportadora_empresa_id := v_motorista.transportadora_empresa_id;
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

  -- Notificar usuários da transportadora (exceto o próprio motorista que fez a mudança)
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_entrega_status_change
AFTER UPDATE OF status ON public.entregas
FOR EACH ROW
EXECUTE FUNCTION public.notify_entrega_status_change();

-- ============================================
-- TRIGGER: Notificação quando nova mensagem é enviada
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
  v_chat RECORD;
  v_entrega RECORD;
BEGIN
  -- Buscar dados do chat e entrega
  SELECT c.*, e.codigo as entrega_codigo, e.id as entrega_id
  INTO v_chat
  FROM chats c
  JOIN entregas e ON e.id = c.entrega_id
  WHERE c.id = NEW.chat_id;

  -- Notificar todos os participantes exceto o remetente
  FOR v_participant IN
    SELECT cp.user_id, cp.tipo_participante
    FROM chat_participantes cp
    WHERE cp.chat_id = NEW.chat_id
      AND cp.user_id != NEW.sender_id
  LOOP
    INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, dados, link)
    VALUES (
      v_participant.user_id,
      'nova_mensagem',
      'Nova mensagem de ' || NEW.sender_nome,
      CASE 
        WHEN length(NEW.conteudo) > 50 THEN substring(NEW.conteudo, 1, 50) || '...'
        ELSE NEW.conteudo
      END,
      jsonb_build_object(
        'chat_id', NEW.chat_id,
        'mensagem_id', NEW.id,
        'sender_nome', NEW.sender_nome,
        'entrega_id', v_chat.entrega_id,
        'entrega_codigo', v_chat.entrega_codigo
      ),
      CASE v_participant.tipo_participante
        WHEN 'embarcador' THEN '/embarcador/mensagens?entrega=' || v_chat.entrega_id::text
        WHEN 'transportadora' THEN '/transportadora/mensagens?entrega=' || v_chat.entrega_id::text
        ELSE '/mensagens?entrega=' || v_chat.entrega_id::text
      END
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_new_message
AFTER INSERT ON public.mensagens
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- ============================================
-- TRIGGER: Notificação quando motorista é adicionado
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_motorista_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_creator_name TEXT;
BEGIN
  -- Buscar nome de quem criou (se possível)
  SELECT u.nome INTO v_creator_name
  FROM usuarios u
  WHERE u.auth_user_id = auth.uid();

  -- Notificar todos os usuários da empresa
  IF NEW.empresa_id IS NOT NULL THEN
    FOR v_user_record IN
      SELECT u.auth_user_id
      FROM usuarios u
      JOIN usuarios_filiais uf ON uf.usuario_id = u.id
      JOIN filiais f ON f.id = uf.filial_id
      WHERE f.empresa_id = NEW.empresa_id
        AND u.auth_user_id IS NOT NULL
        AND u.auth_user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO notificacoes (user_id, empresa_id, tipo, titulo, mensagem, dados, link)
      VALUES (
        v_user_record.auth_user_id,
        NEW.empresa_id,
        'motorista_adicionado',
        'Novo motorista cadastrado',
        'O motorista ' || NEW.nome_completo || ' foi adicionado' || 
          CASE WHEN v_creator_name IS NOT NULL THEN ' por ' || v_creator_name ELSE '' END,
        jsonb_build_object(
          'motorista_id', NEW.id,
          'motorista_nome', NEW.nome_completo,
          'criado_por', v_creator_name
        ),
        '/transportadora/motoristas'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_motorista_added
AFTER INSERT ON public.motoristas
FOR EACH ROW
EXECUTE FUNCTION public.notify_motorista_added();

-- ============================================
-- TRIGGER: Notificação quando CT-e é anexado
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_cte_attached()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carga RECORD;
  v_embarcador_empresa_id BIGINT;
  v_user_record RECORD;
BEGIN
  -- Só notifica se cte_url foi adicionado
  IF OLD.cte_url IS NOT NULL OR NEW.cte_url IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar dados da carga para identificar embarcador
  SELECT c.empresa_id
  INTO v_carga
  FROM cargas c
  WHERE c.id = NEW.carga_id;

  v_embarcador_empresa_id := v_carga.empresa_id;

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
        'cte_anexado',
        'CT-e anexado à entrega',
        'Um CT-e foi anexado à entrega ' || COALESCE(NEW.codigo, NEW.id::text),
        jsonb_build_object(
          'entrega_id', NEW.id,
          'entrega_codigo', NEW.codigo
        ),
        '/embarcador/entregas?entrega=' || NEW.id::text
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cte_attached
AFTER UPDATE OF cte_url ON public.entregas
FOR EACH ROW
EXECUTE FUNCTION public.notify_cte_attached();