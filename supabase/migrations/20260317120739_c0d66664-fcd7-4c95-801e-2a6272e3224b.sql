
-- Remove old invoice data (replacing quinzenal model with D+30 individual receivables)
-- First unlink any financeiro_entregas references to old faturas
UPDATE financeiro_entregas SET fatura_embarcador_id = NULL WHERE fatura_embarcador_id IS NOT NULL;
UPDATE financeiro_entregas SET fatura_transportadora_id = NULL WHERE fatura_transportadora_id IS NOT NULL;
UPDATE financeiro_entregas SET fatura_motorista_id = NULL WHERE fatura_motorista_id IS NOT NULL;

-- Delete old invoice data
DELETE FROM faturas;
DELETE FROM faturas_motoristas;

-- Drop old triggers that auto-create quinzenal faturas
DROP TRIGGER IF EXISTS trg_vincular_fatura ON financeiro_entregas;
DROP TRIGGER IF EXISTS trg_recalcular_fatura ON financeiro_entregas;
DROP TRIGGER IF EXISTS trg_vincular_fatura_motorista ON financeiro_entregas;
DROP TRIGGER IF EXISTS trg_recalcular_fatura_motorista ON financeiro_entregas;

-- Drop old functions
DROP FUNCTION IF EXISTS vincular_fatura_automatica() CASCADE;
DROP FUNCTION IF EXISTS recalcular_fatura() CASCADE;
DROP FUNCTION IF EXISTS vincular_fatura_motorista_automatica() CASCADE;
DROP FUNCTION IF EXISTS recalcular_fatura_motorista() CASCADE;
DROP FUNCTION IF EXISTS validar_fatura() CASCADE;
DROP FUNCTION IF EXISTS validar_fatura_motorista() CASCADE;
