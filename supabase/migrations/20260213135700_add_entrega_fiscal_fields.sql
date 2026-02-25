-- Migration: Adicionar campos de controle fiscal em entregas
-- Data: 2026-02-13
-- Descrição: Campos para rastrear geração automática de CT-e e controle de erros

ALTER TABLE public.entregas
  ADD COLUMN IF NOT EXISTS cte_gerado_automaticamente BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cte_tentativas_geracao INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cte_ultimo_erro TEXT,
  ADD COLUMN IF NOT EXISTS cte_proximo_tentativa_em TIMESTAMP WITH TIME ZONE;

-- Comentários explicativos
COMMENT ON COLUMN public.entregas.cte_gerado_automaticamente 
  IS 'Indica se o CT-e foi gerado automaticamente pelo sistema após aceite da transportadora';

COMMENT ON COLUMN public.entregas.cte_tentativas_geracao 
  IS 'Contador de tentativas de geração automática do CT-e (para retry logic)';

COMMENT ON COLUMN public.entregas.cte_ultimo_erro 
  IS 'Última mensagem de erro ao tentar gerar CT-e automaticamente';

COMMENT ON COLUMN public.entregas.cte_proximo_tentativa_em 
  IS 'Timestamp para próxima tentativa de geração (backoff exponencial)';

-- Índice para consultas de entregas com erro na geração de CT-e
CREATE INDEX IF NOT EXISTS idx_entregas_cte_erro 
  ON public.entregas(cte_tentativas_geracao) 
  WHERE cte_tentativas_geracao > 0 AND cte_id IS NULL;
