-- Add carroceria_integrada column to veiculos table
-- When true: vehicle has integrated body, uses its own capacidade_kg/m3
-- When false: vehicle is just a tractor, needs separate carroceria

ALTER TABLE public.veiculos 
ADD COLUMN carroceria_integrada BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.veiculos.carroceria_integrada IS 'Indica se o veículo possui carroceria integrada (true) ou precisa de carroceria separada (false). Quando integrada, usa capacidade_kg/m3 do próprio veículo.';