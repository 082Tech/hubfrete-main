
-- Backfill: preencher data_vencimento com D+30 a partir de entregue_em
UPDATE public.financeiro_entregas fe
SET data_vencimento = (e.entregue_em + INTERVAL '30 days')::date,
    updated_at = now()
FROM public.entregas e
WHERE e.id = fe.entrega_id
  AND fe.data_vencimento IS NULL
  AND e.entregue_em IS NOT NULL;

-- Para os raros casos sem entregue_em, usar created_at da entrega
UPDATE public.financeiro_entregas fe
SET data_vencimento = (e.created_at + INTERVAL '30 days')::date,
    updated_at = now()
FROM public.entregas e
WHERE e.id = fe.entrega_id
  AND fe.data_vencimento IS NULL;
