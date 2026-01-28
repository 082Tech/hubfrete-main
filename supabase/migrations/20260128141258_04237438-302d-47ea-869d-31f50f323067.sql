-- Fix orphaned cargas: restore peso_disponivel_kg and set correct status
-- These are cargas with status 'totalmente_alocada' but no associated entregas
UPDATE cargas
SET 
  peso_disponivel_kg = peso_kg,
  status = 'publicada'
WHERE id IN (
  SELECT c.id
  FROM cargas c
  LEFT JOIN entregas e ON e.carga_id = c.id
  WHERE c.status = 'totalmente_alocada'
  GROUP BY c.id
  HAVING COUNT(e.id) = 0
);