-- Backfill NULL data_vencimento using entregas.entregue_em + 30 days
UPDATE financeiro_entregas f
SET data_vencimento = (e.entregue_em + INTERVAL '30 days')::date
FROM entregas e
WHERE e.id = f.entrega_id
  AND f.data_vencimento IS NULL
  AND e.entregue_em IS NOT NULL;

-- For any remaining NULL (no entregue_em), use created_at + 30 days
UPDATE financeiro_entregas f
SET data_vencimento = (f.created_at + INTERVAL '30 days')::date
WHERE f.data_vencimento IS NULL;