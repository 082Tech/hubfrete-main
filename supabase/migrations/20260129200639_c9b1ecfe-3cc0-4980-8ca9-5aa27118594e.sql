-- Fix ai_chat_messages primary key: allow multiple messages per chat
-- Current schema incorrectly uses chat_id as PRIMARY KEY/UNIQUE, which blocks more than 1 message.

ALTER TABLE public.ai_chat_messages
  DROP CONSTRAINT IF EXISTS ai_chat_messages_pkey;

-- Remove redundant/incorrect unique constraints on chat_id/id (may exist duplicated from previous edits)
ALTER TABLE public.ai_chat_messages
  DROP CONSTRAINT IF EXISTS ai_chat_messages_chat_id_key,
  DROP CONSTRAINT IF EXISTS ai_chat_messages_chat_id_key1,
  DROP CONSTRAINT IF EXISTS ai_chat_messages_id_key,
  DROP CONSTRAINT IF EXISTS ai_chat_messages_id_key1;

-- Set the primary key to the identity column `id`
ALTER TABLE public.ai_chat_messages
  ADD CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id);

-- Helpful index for loading a chat timeline
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_chat_id_created_at
  ON public.ai_chat_messages (chat_id, created_at);
