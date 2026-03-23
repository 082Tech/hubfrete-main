
-- Drop trigger that depends on legacy cte_url column
DROP TRIGGER IF EXISTS trigger_cte_attached ON public.entregas;
DROP FUNCTION IF EXISTS public.notify_cte_attached();

-- Now remove legacy document columns
ALTER TABLE public.entregas DROP COLUMN IF EXISTS cte_url;
ALTER TABLE public.entregas DROP COLUMN IF EXISTS numero_cte;
ALTER TABLE public.entregas DROP COLUMN IF EXISTS manifesto_url;
ALTER TABLE public.viagens DROP COLUMN IF EXISTS manifesto_url;
