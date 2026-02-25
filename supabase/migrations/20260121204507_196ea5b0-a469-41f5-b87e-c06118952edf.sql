-- Adicionar política de DELETE para notificações
CREATE POLICY "Users can delete own notifications"
ON public.notificacoes
FOR DELETE
USING (auth.uid() = user_id);