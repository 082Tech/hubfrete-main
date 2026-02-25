
-- ==============================================
-- VINCULAR EMBARCADORES E TRANSPORTADORAS EXISTENTES
-- COM ESTRUTURA EMPRESAS/FILIAIS
-- ==============================================

-- 1. Criar Empresas e Filiais para embarcadores existentes que não têm
DO $$
DECLARE
  emb RECORD;
  new_empresa_id bigint;
  new_filial_id bigint;
  existing_usuario_id bigint;
BEGIN
  FOR emb IN 
    SELECT * FROM embarcadores WHERE empresa_id IS NULL
  LOOP
    -- Criar Empresa
    INSERT INTO "Empresas" (tipo, classe)
    VALUES ('EMBARCADOR'::tipo_empresa, 'INDÚSTRIA'::classe_empresa)
    RETURNING id INTO new_empresa_id;
    
    -- Criar Filial Matriz
    INSERT INTO "Filiais" (nome, cnpj, empresa_id)
    VALUES (COALESCE(emb.nome_fantasia, emb.razao_social, 'Matriz'), emb.cnpj, new_empresa_id)
    RETURNING id INTO new_filial_id;
    
    -- Atualizar embarcador com empresa_id
    UPDATE embarcadores SET empresa_id = new_empresa_id WHERE id = emb.id;
    
    -- Verificar se já existe Usuario para este user_id
    SELECT id INTO existing_usuario_id 
    FROM "Usuarios" 
    WHERE auth_user_id = emb.user_id;
    
    IF existing_usuario_id IS NULL THEN
      -- Criar Usuario
      INSERT INTO "Usuarios" (auth_user_id, email, nome, cargo)
      VALUES (emb.user_id, emb.email, COALESCE(emb.nome_fantasia, emb.razao_social), 'ADMIN')
      RETURNING id INTO existing_usuario_id;
    END IF;
    
    -- Vincular Usuario à Filial (se não existir vínculo)
    INSERT INTO "Usuarios_Filiais" (usuario_id, filial_id, cargo_na_filial)
    VALUES (existing_usuario_id, new_filial_id, 'ADMIN')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 2. Criar Empresas e Filiais para transportadoras existentes que não têm
DO $$
DECLARE
  transp RECORD;
  new_empresa_id bigint;
  new_filial_id bigint;
  existing_usuario_id bigint;
BEGIN
  FOR transp IN 
    SELECT * FROM transportadoras WHERE empresa_id IS NULL
  LOOP
    -- Criar Empresa
    INSERT INTO "Empresas" (tipo, classe)
    VALUES ('TRANSPORTADORA'::tipo_empresa, 'COMÉRCIO'::classe_empresa)
    RETURNING id INTO new_empresa_id;
    
    -- Criar Filial Matriz
    INSERT INTO "Filiais" (nome, cnpj, empresa_id)
    VALUES (COALESCE(transp.nome_fantasia, transp.razao_social, 'Matriz'), transp.cnpj, new_empresa_id)
    RETURNING id INTO new_filial_id;
    
    -- Atualizar transportadora com empresa_id
    UPDATE transportadoras SET empresa_id = new_empresa_id WHERE id = transp.id;
    
    -- Verificar se já existe Usuario para este user_id
    SELECT id INTO existing_usuario_id 
    FROM "Usuarios" 
    WHERE auth_user_id = transp.user_id;
    
    IF existing_usuario_id IS NULL THEN
      -- Criar Usuario
      INSERT INTO "Usuarios" (auth_user_id, email, nome, cargo)
      VALUES (transp.user_id, transp.email, COALESCE(transp.nome_fantasia, transp.razao_social), 'ADMIN')
      RETURNING id INTO existing_usuario_id;
    END IF;
    
    -- Vincular Usuario à Filial (se não existir vínculo)
    INSERT INTO "Usuarios_Filiais" (usuario_id, filial_id, cargo_na_filial)
    VALUES (existing_usuario_id, new_filial_id, 'ADMIN')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
