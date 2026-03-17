-- Bloco 4.1: Desvincular financeiro_entregas das faturas antigas
UPDATE financeiro_entregas SET fatura_embarcador_id = NULL WHERE fatura_embarcador_id IS NOT NULL;
UPDATE financeiro_entregas SET fatura_transportadora_id = NULL WHERE fatura_transportadora_id IS NOT NULL;

-- 4.2: Remover triggers antigos de faturas quinzenais
DROP TRIGGER IF EXISTS trg_vincular_fatura ON financeiro_entregas;
DROP TRIGGER IF EXISTS trg_recalcular_fatura ON financeiro_entregas;
DROP TRIGGER IF EXISTS trg_vincular_fatura_motorista ON financeiro_entregas;
DROP TRIGGER IF EXISTS trg_recalcular_fatura_motorista ON financeiro_entregas;
DROP TRIGGER IF EXISTS vincular_fatura_motorista_trigger ON financeiro_entregas;
DROP TRIGGER IF EXISTS recalcular_fatura_motorista_trigger ON financeiro_entregas;

-- 4.3: Remover funções legado
DROP FUNCTION IF EXISTS vincular_fatura_automatica() CASCADE;
DROP FUNCTION IF EXISTS recalcular_fatura() CASCADE;
DROP FUNCTION IF EXISTS vincular_fatura_motorista_automatica() CASCADE;
DROP FUNCTION IF EXISTS recalcular_fatura_motorista() CASCADE;
DROP FUNCTION IF EXISTS validar_fatura() CASCADE;
DROP FUNCTION IF EXISTS validar_fatura_motorista() CASCADE;

-- 4.4: Remover tabela legado faturas
DROP TABLE IF EXISTS faturas CASCADE;

-- 4.5: Remover enums legado (se existirem e não estiverem mais em uso)
DROP TYPE IF EXISTS status_fatura CASCADE;
DROP TYPE IF EXISTS tipo_fatura CASCADE;