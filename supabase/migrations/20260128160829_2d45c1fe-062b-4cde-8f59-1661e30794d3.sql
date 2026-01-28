-- Fix the cargo that had duplicate entregas - set correct available weight and status
UPDATE cargas 
SET peso_disponivel_kg = 0,
    status = 'totalmente_alocada'::status_carga,
    updated_at = NOW()
WHERE id = '6ac87c8a-e635-4fe2-8876-98ac5b4f7774';