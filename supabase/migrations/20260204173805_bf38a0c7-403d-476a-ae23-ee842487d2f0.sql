-- Create the trigger for generating viagem codigo
CREATE TRIGGER trigger_generate_viagem_codigo
BEFORE INSERT ON public.viagens
FOR EACH ROW
EXECUTE FUNCTION public.generate_viagem_codigo();

-- Add comment for documentation
COMMENT ON TRIGGER trigger_generate_viagem_codigo ON public.viagens IS 'Auto-generates viagem codigo in format VGM-YYYY-NNNN';