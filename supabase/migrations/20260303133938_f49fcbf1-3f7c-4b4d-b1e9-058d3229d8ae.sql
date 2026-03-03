
-- Delete viagem_entregas junction
DELETE FROM viagem_entregas WHERE viagem_id = '026d64c2-c9f5-4997-b204-7072cb7c5e8e';

-- Delete entrega eventos
DELETE FROM entrega_eventos WHERE entrega_id = '8c49918c-f4e0-47b2-8946-44094cfdc438';

-- Delete the entrega
DELETE FROM entregas WHERE id = '8c49918c-f4e0-47b2-8946-44094cfdc438';

-- Delete the viagem
DELETE FROM viagens WHERE id = '026d64c2-c9f5-4997-b204-7072cb7c5e8e';

-- Restore cargo weight
UPDATE cargas 
SET peso_disponivel_kg = peso_kg, 
    status = 'publicada',
    updated_at = NOW()
WHERE id = '7cc002ec-e4db-4115-8ae6-96d85a9edbf2';
