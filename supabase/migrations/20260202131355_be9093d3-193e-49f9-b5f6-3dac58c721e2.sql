-- Remover trigger que usa entrega_id
DROP TRIGGER IF EXISTS trigger_sync_locations_to_history ON public.locations;
DROP TRIGGER IF EXISTS sync_locations_trigger ON public.locations;

-- Remover a função obsoleta
DROP FUNCTION IF EXISTS public.sync_locations_to_history();

-- Garantir que o trigger correto (baseado em motorista_id) está ativo
DROP TRIGGER IF EXISTS trigger_sync_localizacoes_historico ON public.locations;
CREATE TRIGGER trigger_sync_localizacoes_historico
AFTER INSERT OR UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.sync_localizacoes_to_tracking_historico();