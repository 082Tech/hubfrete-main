
-- Drop defaults before changing enum
ALTER TABLE ajudantes ALTER COLUMN tipo_cadastro DROP DEFAULT;
ALTER TABLE motoristas ALTER COLUMN tipo_cadastro DROP DEFAULT;

-- Recreate enum without terceirizado
ALTER TYPE tipo_cadastro_motorista RENAME TO tipo_cadastro_motorista_old;
CREATE TYPE tipo_cadastro_motorista AS ENUM ('frota', 'autonomo');

ALTER TABLE motoristas 
  ALTER COLUMN tipo_cadastro TYPE tipo_cadastro_motorista 
  USING tipo_cadastro::text::tipo_cadastro_motorista;

ALTER TABLE ajudantes 
  ALTER COLUMN tipo_cadastro TYPE tipo_cadastro_motorista 
  USING tipo_cadastro::text::tipo_cadastro_motorista;

DROP TYPE tipo_cadastro_motorista_old;

-- Restore defaults
ALTER TABLE ajudantes ALTER COLUMN tipo_cadastro SET DEFAULT 'autonomo'::tipo_cadastro_motorista;
ALTER TABLE motoristas ALTER COLUMN tipo_cadastro SET DEFAULT 'frota'::tipo_cadastro_motorista;
