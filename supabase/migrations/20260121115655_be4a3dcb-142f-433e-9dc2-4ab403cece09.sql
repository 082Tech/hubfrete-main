
-- Step 1: Remove carga_id reference from enderecos_carga for cargas to be deleted
UPDATE public.enderecos_carga 
SET carga_id = NULL
WHERE carga_id IN (
  SELECT id FROM public.cargas 
  WHERE empresa_id = 2 
    AND codigo NOT IN ('CRG-2026-0020', 'CRG-2026-0021')
);

-- Step 2: Unlink addresses from cargas to be deleted
UPDATE public.cargas 
SET endereco_origem_id = NULL, endereco_destino_id = NULL
WHERE empresa_id = 2 
  AND codigo NOT IN ('CRG-2026-0020', 'CRG-2026-0021');

-- Step 3: Delete the cargas
DELETE FROM public.cargas 
WHERE empresa_id = 2 
  AND codigo NOT IN ('CRG-2026-0020', 'CRG-2026-0021');

-- Step 4: Delete orphaned addresses
DELETE FROM public.enderecos_carga 
WHERE id IN (
  'e0000001-0001-0001-0001-000000000001',
  'e0000001-0001-0001-0001-000000000002',
  'e0000001-0001-0001-0001-000000000003',
  'e0000001-0001-0001-0001-000000000004',
  'fcf1d41e-ead3-4b74-bd23-599462f73a7d',
  '7d6d3b3d-eb57-4c76-895b-af3f4cfce84d',
  'ddc9f278-c8cb-4fc2-ac9c-dd756b5b5b49',
  '8f201107-0230-4cb1-81cd-3321c5d5826f',
  'fa198170-9097-48e4-8606-5ecacbd57145',
  'f9d3ad83-86d7-4031-ab7a-9612026f0ead'
);
