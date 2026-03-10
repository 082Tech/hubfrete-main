-- Step 1: Delete all existing financeiro_entregas
DELETE FROM financeiro_entregas;

-- Step 2: Recreate from entregas with entregue_em as created_at, 10% commission
INSERT INTO financeiro_entregas (
  entrega_id, valor_frete, valor_comissao, valor_liquido,
  empresa_embarcadora_id, empresa_transportadora_id,
  status, created_at, updated_at
)
SELECT 
  e.id,
  e.valor_frete,
  ROUND(e.valor_frete * 0.10, 2),
  ROUND(e.valor_frete * 0.90, 2),
  c.empresa_id,
  (SELECT m.empresa_id FROM motoristas m WHERE m.id = e.motorista_id LIMIT 1),
  'pendente',
  e.entregue_em,
  e.entregue_em
FROM entregas e
JOIN cargas c ON c.id = e.carga_id
WHERE e.status = 'entregue' AND e.entregue_em IS NOT NULL AND e.valor_frete IS NOT NULL AND e.valor_frete > 0;