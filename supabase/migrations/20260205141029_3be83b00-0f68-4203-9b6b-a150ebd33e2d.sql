-- Adiciona o tipo 'criado' à constraint existente de entrega_eventos
ALTER TABLE public.entrega_eventos
DROP CONSTRAINT IF EXISTS entrega_eventos_tipo_check;

ALTER TABLE public.entrega_eventos
ADD CONSTRAINT entrega_eventos_tipo_check
CHECK (tipo IN (
  'criado',
  'aceite',
  'inicio_coleta',
  'inicio_rota',
  'finalizado',
  'problema',
  'cancelado'
));