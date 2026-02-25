
-- 1. Update empresa name from Carajás to HubFrete
UPDATE public.empresas 
SET nome = 'HubFrete'
WHERE id = 2;

-- 2. Delete usuarios_filiais links to Filial SP (id=100)
DELETE FROM public.usuarios_filiais WHERE filial_id = 100;

-- 3. Delete Filial SP
DELETE FROM public.filiais WHERE id = 100;

-- 4. Update Matriz filial name to be cleaner
UPDATE public.filiais 
SET nome = 'Matriz', cidade = 'Parauapebas'
WHERE id = 2 AND empresa_id = 2;
