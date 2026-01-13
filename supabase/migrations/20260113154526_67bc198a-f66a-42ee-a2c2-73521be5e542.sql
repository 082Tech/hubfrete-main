-- Adicionar campos extras à tabela Filiais para suportar gerenciamento completo

ALTER TABLE "Filiais" 
ADD COLUMN IF NOT EXISTS endereco text,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado varchar(2),
ADD COLUMN IF NOT EXISTS cep varchar(10),
ADD COLUMN IF NOT EXISTS telefone varchar(20),
ADD COLUMN IF NOT EXISTS email varchar(255),
ADD COLUMN IF NOT EXISTS responsavel text,
ADD COLUMN IF NOT EXISTS ativa boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_matriz boolean DEFAULT false;

-- Marcar as primeiras filiais de cada empresa como matriz
UPDATE "Filiais" f1
SET is_matriz = true
WHERE f1.id = (
  SELECT MIN(f2.id) 
  FROM "Filiais" f2 
  WHERE f2.empresa_id = f1.empresa_id
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_filiais_empresa_ativa ON "Filiais" (empresa_id, ativa);