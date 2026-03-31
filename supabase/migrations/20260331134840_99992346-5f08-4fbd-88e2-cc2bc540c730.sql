
-- Fix audit trigger: cast id to text since registro_id is text type on some tables
-- but uuid on auditoria_logs. We need to alter the column to text to be universal.
ALTER TABLE auditoria_logs ALTER COLUMN registro_id TYPE text USING registro_id::text;
