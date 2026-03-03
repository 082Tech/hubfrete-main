-- Drop the OLD accept_carga_tx overloads that use integer for p_peso_kg
-- This resolves PGRST203 ambiguity error

-- Drop the 8-parameter version (oldest, no previsao_coleta/carrocerias_alocadas)
DROP FUNCTION IF EXISTS public.accept_carga_tx(uuid, uuid, uuid, uuid, numeric, numeric, uuid, text);

-- Drop the version with integer p_peso_kg (10 params)
DROP FUNCTION IF EXISTS public.accept_carga_tx(uuid, uuid, uuid, uuid, integer, numeric, uuid, text, timestamptz, jsonb);
