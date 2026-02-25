-- Remover a constraint UNIQUE do sessionid em ai_chat_messages
-- pois múltiplas mensagens podem ter o mesmo sessionid
ALTER TABLE public.ai_chat_messages DROP CONSTRAINT IF EXISTS ai_chat_messages_sessionid_key;