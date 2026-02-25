-- Criar políticas RLS para ai_chat
-- Usuários podem ver apenas suas próprias conversas
CREATE POLICY "Users can view their own chats"
ON public.ai_chat
FOR SELECT
USING (user_id IN (
  SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

-- Usuários podem criar suas próprias conversas
CREATE POLICY "Users can create their own chats"
ON public.ai_chat
FOR INSERT
WITH CHECK (user_id IN (
  SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

-- Usuários podem atualizar suas próprias conversas
CREATE POLICY "Users can update their own chats"
ON public.ai_chat
FOR UPDATE
USING (user_id IN (
  SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

-- Usuários podem deletar suas próprias conversas
CREATE POLICY "Users can delete their own chats"
ON public.ai_chat
FOR DELETE
USING (user_id IN (
  SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

-- Criar políticas RLS para ai_chat_messages
-- Usuários podem ver mensagens dos seus próprios chats
CREATE POLICY "Users can view messages from their chats"
ON public.ai_chat_messages
FOR SELECT
USING (chat_id IN (
  SELECT id FROM public.ai_chat WHERE user_id IN (
    SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
));

-- Usuários podem criar mensagens nos seus próprios chats
CREATE POLICY "Users can create messages in their chats"
ON public.ai_chat_messages
FOR INSERT
WITH CHECK (chat_id IN (
  SELECT id FROM public.ai_chat WHERE user_id IN (
    SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
));

-- Usuários podem deletar mensagens dos seus próprios chats
CREATE POLICY "Users can delete messages from their chats"
ON public.ai_chat_messages
FOR DELETE
USING (chat_id IN (
  SELECT id FROM public.ai_chat WHERE user_id IN (
    SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
));