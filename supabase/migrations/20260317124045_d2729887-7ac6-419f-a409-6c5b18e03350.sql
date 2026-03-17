
-- 1. Set entregue_em for delivered entregas missing it
UPDATE entregas 
SET entregue_em = COALESCE(updated_at, created_at, NOW())
WHERE status = 'entregue' AND entregue_em IS NULL;

-- 2. Insert financeiro_entregas for all delivered entregas missing records
INSERT INTO financeiro_entregas (
  entrega_id, empresa_transportadora_id, empresa_embarcadora_id,
  valor_frete, valor_comissao, valor_liquido,
  data_vencimento, motorista_id, tipo_beneficiario, status
)
SELECT 
  e.id,
  m.empresa_id,
  c.empresa_id,
  COALESCE(e.valor_frete, 0),
  ROUND(COALESCE(e.valor_frete, 0) * COALESCE(emp.comissao_hubfrete_percent, 20) / 100, 2),
  COALESCE(e.valor_frete, 0) - ROUND(COALESCE(e.valor_frete, 0) * COALESCE(emp.comissao_hubfrete_percent, 20) / 100, 2),
  COALESCE(e.entregue_em, NOW()) + INTERVAL '30 days',
  e.motorista_id,
  CASE WHEN m.tipo_cadastro = 'autonomo' THEN 'autonomo' ELSE 'transportadora' END,
  'pendente'
FROM entregas e
JOIN cargas c ON c.id = e.carga_id
LEFT JOIN motoristas m ON m.id = e.motorista_id
LEFT JOIN empresas emp ON emp.id = c.empresa_id
WHERE e.status = 'entregue'
  AND NOT EXISTS (SELECT 1 FROM financeiro_entregas fe WHERE fe.entrega_id = e.id);

-- 3. Drop legacy tables (both are empty)
DROP TABLE IF EXISTS faturas_motoristas CASCADE;
DROP TABLE IF EXISTS faturas CASCADE;

-- 4. Drop legacy enum if exists
DROP TYPE IF EXISTS status_fatura CASCADE;
DROP TYPE IF EXISTS tipo_fatura CASCADE;
