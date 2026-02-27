
-- Remove motorista_id from veiculos (no more driver-vehicle permanent binding)
ALTER TABLE public.veiculos DROP COLUMN IF EXISTS motorista_id;

-- Remove motorista_id from carrocerias (no more driver-trailer permanent binding)  
ALTER TABLE public.carrocerias DROP COLUMN IF EXISTS motorista_id;

-- Remove carroceria_id from veiculos (redundant - binding is via carrocerias.veiculo_id)
ALTER TABLE public.veiculos DROP COLUMN IF EXISTS carroceria_id;
