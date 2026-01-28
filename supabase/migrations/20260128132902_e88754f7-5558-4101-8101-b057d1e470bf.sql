-- Normalizar instance_id do GoTrue para evitar erros de "Database error checking email"
-- Em instalações Supabase, o instance_id padrão usado é 00000000-0000-0000-0000-000000000000.
UPDATE auth.users
SET instance_id = '00000000-0000-0000-0000-000000000000'
WHERE instance_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000000';
