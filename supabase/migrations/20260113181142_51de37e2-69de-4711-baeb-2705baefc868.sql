-- Fix demo/seed data ownership so the logged-in embarcador (empresa_id=2) can see existing cargas/entregas/cotações
-- NOTE: entregas/cotacoes reference cargas by carga_id, so updating cargas.empresa_id is sufficient.
UPDATE public.cargas
SET empresa_id = 2
WHERE empresa_id = 3;