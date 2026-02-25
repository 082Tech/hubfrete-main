
-- Clean up: Remove entregas from cargas that are still publicada/em_cotacao (shouldn't have entregas)
DELETE FROM entregas 
WHERE carga_id IN (
  SELECT id FROM cargas WHERE status IN ('publicada', 'em_cotacao')
);

-- Update peso_disponivel for these cargas
UPDATE cargas 
SET peso_disponivel_kg = peso_kg 
WHERE status IN ('publicada', 'em_cotacao');

-- Add entrega for CRG-2026-0003 (aceita) that was missing
INSERT INTO entregas (id, carga_id, status, peso_alocado_kg, valor_frete, motorista_id, veiculo_id)
VALUES (
  'a0000001-0000-0000-0000-000000000011',
  'b0000001-0000-0000-0000-000000000002',
  'aguardando_coleta',
  5000,
  750.00,
  'e0000001-0000-0000-0000-000000000001',
  'f0000001-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;

-- Update peso_disponivel for aceita carga
UPDATE cargas SET peso_disponivel_kg = 0 WHERE id = 'b0000001-0000-0000-0000-000000000002';
