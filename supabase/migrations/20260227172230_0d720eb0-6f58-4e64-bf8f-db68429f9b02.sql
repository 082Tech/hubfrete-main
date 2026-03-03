
-- Add veiculo_id to carrocerias to link trailers to vehicles
ALTER TABLE public.carrocerias ADD COLUMN IF NOT EXISTS veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_carrocerias_veiculo_id ON public.carrocerias(veiculo_id);
