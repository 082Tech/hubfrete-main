-- Remove trigger from carga_fracoes
DROP TRIGGER IF EXISTS trigger_update_carga_peso_fracao ON public.carga_fracoes;

-- Remove the updated_at trigger
DROP TRIGGER IF EXISTS update_carga_fracoes_updated_at ON public.carga_fracoes;

-- Remove foreign key from entregas
ALTER TABLE public.entregas DROP COLUMN IF EXISTS carga_fracao_id;

-- Drop the carga_fracoes table
DROP TABLE IF EXISTS public.carga_fracoes;

-- Drop the function
DROP FUNCTION IF EXISTS public.update_carga_peso_from_fracao();

-- Drop the enum
DROP TYPE IF EXISTS public.status_fracao;