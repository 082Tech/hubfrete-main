
-- Corrige o peso da entrega cancelada que não foi zerado
UPDATE public.entregas 
SET peso_alocado_kg = 0
WHERE id = '7bbcb507-5b76-403b-a636-1ff254ee50bb' 
AND status = 'cancelada';

-- Corrige o peso disponível da carga (restaura peso total já que não há entregas ativas)
UPDATE public.cargas 
SET peso_disponivel_kg = peso_kg,
    status = 'publicada'
WHERE id = '4a88f24a-bc1c-4995-9ce6-a9e23579a81c';
