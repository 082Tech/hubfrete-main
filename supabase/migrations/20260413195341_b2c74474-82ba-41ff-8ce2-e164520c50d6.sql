
-- Habilitar pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Agendar expiração de cargas vencidas a cada hora
SELECT cron.schedule('expirar-cargas-vencidas', '0 * * * *', $$SELECT public.expirar_cargas_vencidas();$$);
