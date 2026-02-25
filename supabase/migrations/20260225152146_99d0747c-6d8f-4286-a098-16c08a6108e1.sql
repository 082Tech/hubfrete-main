UPDATE public.cargas 
SET expira_em = NOW() + INTERVAL '1 month' 
WHERE status IN ('publicada', 'parcialmente_alocada') 
AND expira_em IS NULL;