
-- Remove the legacy trigger that conflicts with accept_carga_tx
DROP TRIGGER IF EXISTS trigger_manage_viagem ON public.entregas;

-- Now drop the function
DROP FUNCTION IF EXISTS public.manage_viagem_from_entrega();
