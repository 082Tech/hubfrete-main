
-- ==============================================
-- ADICIONAR empresa_id EM EMBARCADORES E TRANSPORTADORAS
-- E VINCULAR COM EMPRESAS/FILIAIS
-- ==============================================

-- 1. Adicionar empresa_id em embarcadores e transportadoras
ALTER TABLE embarcadores 
ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES "Empresas"(id);

ALTER TABLE transportadoras 
ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES "Empresas"(id);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_embarcadores_empresa_id ON embarcadores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_transportadoras_empresa_id ON transportadoras(empresa_id);
