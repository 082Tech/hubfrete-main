-- Fix: Add auto-set started_at trigger for viagens
CREATE OR REPLACE FUNCTION public.auto_set_viagem_started_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is em_andamento and started_at is not set, set it to now()
  IF NEW.status = 'em_andamento' AND NEW.started_at IS NULL THEN
    NEW.started_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-set started_at (use IF NOT EXISTS pattern)
DROP TRIGGER IF EXISTS trigger_auto_set_viagem_started_at ON public.viagens;
CREATE TRIGGER trigger_auto_set_viagem_started_at
BEFORE INSERT OR UPDATE ON public.viagens
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_viagem_started_at();

-- Create cleanup function for viagem_entregas when entrega is deleted
CREATE OR REPLACE FUNCTION public.cleanup_viagem_entrega_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove the link from viagem_entregas
  DELETE FROM public.viagem_entregas WHERE entrega_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for cleanup (use IF NOT EXISTS pattern)
DROP TRIGGER IF EXISTS trigger_cleanup_viagem_entrega_on_delete ON public.entregas;
CREATE TRIGGER trigger_cleanup_viagem_entrega_on_delete
BEFORE DELETE ON public.entregas
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_viagem_entrega_on_delete();