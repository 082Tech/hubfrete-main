-- Fix infinite recursion in RLS policies for chat_participantes by moving participant checks into a SECURITY DEFINER function.

-- 1) Helper function (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_chat_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participantes cp
    WHERE cp.chat_id = p_chat_id
      AND cp.user_id = p_user_id
  );
$$;

-- 2) Ensure RLS is enabled
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

-- 3) Remove existing policies (avoid recursion / conflicts)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('chats','chat_participantes','mensagens')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 4) Recreate minimal, safe policies

-- CHATS: participants can read their chats
CREATE POLICY "Chats: participants can read"
ON public.chats
FOR SELECT
USING (public.is_chat_participant(id, auth.uid()));

-- No direct writes from client (created by Edge Function/service role)
CREATE POLICY "Chats: no client insert"
ON public.chats
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Chats: no client update"
ON public.chats
FOR UPDATE
USING (false);

CREATE POLICY "Chats: no client delete"
ON public.chats
FOR DELETE
USING (false);

-- CHAT_PARTICIPANTES: participants can read participant list of chats they are in
CREATE POLICY "Chat participantes: participants can read"
ON public.chat_participantes
FOR SELECT
USING (public.is_chat_participant(chat_id, auth.uid()));

-- No direct writes from client
CREATE POLICY "Chat participantes: no client insert"
ON public.chat_participantes
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Chat participantes: no client update"
ON public.chat_participantes
FOR UPDATE
USING (false);

CREATE POLICY "Chat participantes: no client delete"
ON public.chat_participantes
FOR DELETE
USING (false);

-- MENSAGENS: participants can read messages
CREATE POLICY "Mensagens: participants can read"
ON public.mensagens
FOR SELECT
USING (public.is_chat_participant(chat_id, auth.uid()));

-- participants can send messages as themselves
CREATE POLICY "Mensagens: participants can send"
ON public.mensagens
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_chat_participant(chat_id, auth.uid())
);

-- allow sender to update their own messages (e.g., edits if ever enabled) and participants can mark read
CREATE POLICY "Mensagens: participants can update"
ON public.mensagens
FOR UPDATE
USING (public.is_chat_participant(chat_id, auth.uid()));

-- no deletes from client
CREATE POLICY "Mensagens: no client delete"
ON public.mensagens
FOR DELETE
USING (false);
