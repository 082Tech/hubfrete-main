-- Tabela para armazenar subscriptions de push notifications
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Índice para busca por user_id
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);