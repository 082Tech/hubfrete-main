-- Remove foreign key constraints that reference cotacoes
ALTER TABLE IF EXISTS entregas DROP CONSTRAINT IF EXISTS entregas_cotacao_id_fkey;

-- Drop the cotacoes table
DROP TABLE IF EXISTS cotacoes;

-- Drop the status_cotacao enum if no longer needed
DROP TYPE IF EXISTS status_cotacao;