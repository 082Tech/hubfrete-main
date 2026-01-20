-- Create chats table linked to entregas
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entrega_id UUID NOT NULL REFERENCES public.entregas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entrega_id)
);

-- Create chat participants table
CREATE TABLE public.chat_participantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- auth.users id
  tipo_participante TEXT NOT NULL CHECK (tipo_participante IN ('embarcador', 'transportadora', 'motorista')),
  empresa_id BIGINT REFERENCES public.empresas(id),
  motorista_id UUID REFERENCES public.motoristas(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE public.mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL, -- auth.users id
  sender_nome TEXT NOT NULL,
  sender_tipo TEXT NOT NULL CHECK (sender_tipo IN ('embarcador', 'transportadora', 'motorista')),
  conteudo TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_chats_entrega_id ON public.chats(entrega_id);
CREATE INDEX idx_chat_participantes_chat_id ON public.chat_participantes(chat_id);
CREATE INDEX idx_chat_participantes_user_id ON public.chat_participantes(user_id);
CREATE INDEX idx_mensagens_chat_id ON public.mensagens(chat_id);
CREATE INDEX idx_mensagens_created_at ON public.mensagens(created_at DESC);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
CREATE POLICY "Users can view chats they participate in"
ON public.chats FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participantes cp
    WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create chats"
ON public.chats FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for chat_participantes
CREATE POLICY "Users can view participants of their chats"
ON public.chat_participantes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participantes cp
    WHERE cp.chat_id = chat_participantes.chat_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can add participants"
ON public.chat_participantes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for mensagens
CREATE POLICY "Users can view messages from their chats"
ON public.mensagens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participantes cp
    WHERE cp.chat_id = mensagens.chat_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their chats"
ON public.mensagens FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chat_participantes cp
    WHERE cp.chat_id = mensagens.chat_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages"
ON public.mensagens FOR UPDATE
USING (auth.uid() = sender_id);

-- Trigger to update chats.updated_at when new message is added
CREATE OR REPLACE FUNCTION public.update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats SET updated_at = NOW() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_chat_on_message
AFTER INSERT ON public.mensagens
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_updated_at();

-- Function to create chat and participants for a delivery
CREATE OR REPLACE FUNCTION public.create_chat_for_entrega(
  p_entrega_id UUID
) RETURNS UUID AS $$
DECLARE
  v_chat_id UUID;
  v_carga RECORD;
  v_entrega RECORD;
  v_motorista RECORD;
  v_embarcador_empresa_id BIGINT;
  v_transportadora_empresa_id BIGINT;
BEGIN
  -- Check if chat already exists
  SELECT id INTO v_chat_id FROM public.chats WHERE entrega_id = p_entrega_id;
  IF v_chat_id IS NOT NULL THEN
    RETURN v_chat_id;
  END IF;

  -- Get entrega details
  SELECT * INTO v_entrega FROM public.entregas WHERE id = p_entrega_id;
  IF v_entrega IS NULL THEN
    RAISE EXCEPTION 'Entrega not found';
  END IF;

  -- Get carga details to find embarcador empresa_id
  SELECT * INTO v_carga FROM public.cargas WHERE id = v_entrega.carga_id;
  v_embarcador_empresa_id := v_carga.empresa_id;

  -- Get motorista details
  SELECT * INTO v_motorista FROM public.motoristas WHERE id = v_entrega.motorista_id;

  -- Create the chat
  INSERT INTO public.chats (entrega_id) VALUES (p_entrega_id) RETURNING id INTO v_chat_id;

  -- If motorista is from a transportadora (tipo_cadastro = 'frota')
  IF v_motorista.tipo_cadastro = 'frota' AND v_motorista.empresa_id IS NOT NULL THEN
    v_transportadora_empresa_id := v_motorista.empresa_id;
  END IF;

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;