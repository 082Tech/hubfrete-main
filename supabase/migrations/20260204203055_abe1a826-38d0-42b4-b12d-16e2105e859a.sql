-- Adicionar política explícita para INSERT na tabela entrega_eventos
-- permitindo que usuários autenticados insiram eventos

-- Primeiro remover a política ALL se existir
DROP POLICY IF EXISTS "entrega_eventos_all" ON public.entrega_eventos;

-- Criar política para SELECT (qualquer um pode ver)
DROP POLICY IF EXISTS "entrega_eventos_select" ON public.entrega_eventos;
CREATE POLICY "entrega_eventos_select" ON public.entrega_eventos
  FOR SELECT USING (true);

-- Criar política para INSERT (usuários autenticados podem inserir)
CREATE POLICY "entrega_eventos_insert" ON public.entrega_eventos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Criar política para UPDATE (usuários autenticados podem atualizar)
CREATE POLICY "entrega_eventos_update" ON public.entrega_eventos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Criar política para DELETE (usuários autenticados podem deletar)
CREATE POLICY "entrega_eventos_delete" ON public.entrega_eventos
  FOR DELETE USING (auth.uid() IS NOT NULL);